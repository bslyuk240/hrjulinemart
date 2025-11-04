import { supabase } from './supabase';

// 🔹 Get employee ID by email
export const getEmployeeIdByEmail = async (email) => {
  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("email", email)
    .single();

  if (error || !data) return null;
  return data.id;
};

// Get all requests (admin sees all, employee sees own)
export const getAllRequests = async (userId, isAdmin) => {
  try {
    let query = supabase
  .from('requests')
  .select(`
    *,
    employee:employees!employee_id(name, email, employee_code, position)
  `)
  .order('created_at', { ascending: false });

// Ensure only relevant requests load
if (isAdmin) {
  // Admin sees all
  query = query;
} else if (userId) {
  // Employees/managers see only their own
  query = query.eq('employee_id', userId);
}


    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching requests:', error);
    return { success: false, error: error.message };
  }
};

// Create new request
export const createRequest = async (requestData, employeeId) => {
  try {
    const newRequest = {
      employee_id: employeeId,
      kind: requestData.kind,
      amount: parseFloat(requestData.amount),
      currency: requestData.currency,
      needed_by: requestData.needed_by || null,
      description: requestData.description,
      status: 'Pending',
    };

    const { data, error } = await supabase
      .from('requests')
      .insert([newRequest])
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating request:', error);
    return { success: false, error: error.message };
  }
};

// Upload receipt
export const uploadReceipt = async (requestId, employeeId, file) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${employeeId}/${requestId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Save receipt path in notes
    const { error: noteError } = await supabase
      .from('request_notes')
      .insert({
        request_id: requestId,
        author_id: employeeId,
        note: `receipt:${uploadData.path}`,
      });

    if (noteError) throw noteError;

    return { success: true, path: uploadData.path };
  } catch (error) {
    console.error('Error uploading receipt:', error);
    return { success: false, error: error.message };
  }
};

// Get signed URL for receipt
export const getReceiptUrl = async (path) => {
  try {
    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrl(path, 3600);

    if (error) throw error;

    return { success: true, url: data.signedUrl };
  } catch (error) {
    console.error('Error getting receipt URL:', error);
    return { success: false, error: error.message };
  }
};

// Update request status (admin only)
export const updateRequestStatus = async (requestId, status, comment = null, employeeId) => {
  try {
    // Update the request status
    const { error: updateError } = await supabase
      .from('requests')
      .update({
        status,
        updated_at: new Date(),
      })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // ✅ Record comment if provided
    if (comment && comment.trim() !== '') {
      const { error: noteError } = await supabase.from('request_notes').insert({
        request_id: requestId,
        author_id: employeeId,
        note: comment.trim(),
        created_at: new Date(),
      });
      if (noteError) throw noteError;
    }

    // ✅ Record payout if marked as Paid
    if (status === 'Paid') {
      const { data: requestData, error: fetchError } = await supabase
        .from('requests')
        .select('amount')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      const { error: payoutError } = await supabase.from('payouts').insert({
        request_id: requestId,
        amount: requestData.amount,
        paid_by: employeeId,
        paid_at: new Date(),
      });

      if (payoutError) throw payoutError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating request:', error);
    return { success: false, error: error.message };
  }
};


// Delete request (admin only)
export const deleteRequest = async (requestId) => {
  try {
    await supabase.from('request_notes').delete().eq('request_id', requestId);
    await supabase.from('payouts').delete().eq('request_id', requestId);
    
    const { error } = await supabase
      .from('requests')
      .delete()
      .eq('id', requestId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting request:', error);
    return { success: false, error: error.message };
  }
};

// Get request notes
export const getRequestNotes = async (requestId) => {
  const { data, error } = await supabase
    .from('request_notes')
    .select(`
      id,
      note,
      created_at,
      author_id,
      employees:author_id (
        name,
        email,
        position,
        department
      )
    `)
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching notes:', error.message);
    return { success: false, error: error.message };
  }

  const formatted = data.map((n) => ({
    ...n,
    author: n.employees
      ? {
          name: n.employees.name,
          email: n.employees.email,
          role: n.employees.position || n.employees.department || 'Staff',
        }
      : { name: 'Admin', role: '' },
  }));

  return { success: true, data: formatted };
};


// Get statistics
export const getRequestStats = async (isAdmin, employeeId = null) => {
  try {
    let query = supabase.from('requests').select('amount, currency, status');

    if (!isAdmin && employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const paidRequests = data.filter(r => r.status === 'Paid');

    const stats = {
      total: data.length,
      pending: data.filter(r => r.status === 'Pending').length,
      approved: data.filter(r => r.status === 'Approved').length,
      declined: data.filter(r => r.status === 'Declined').length,
      paid: paidRequests.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0), // total paid amount
      totalPaid: paidRequests.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0),
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { success: false, error: error.message };
  }
};

// 🔹 Add new comment / reply to request thread
export const addRequestNote = async (requestId, note, employeeId) => {
  try {
    if (!note || !note.trim()) throw new Error("Note cannot be empty");

    const { error } = await supabase.from("request_notes").insert({
      request_id: requestId,
      author_id: employeeId,
      note: note.trim(),
      created_at: new Date(),
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error adding note:", error.message);
    return { success: false, error: error.message };
  }
};
