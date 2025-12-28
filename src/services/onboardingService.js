import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from './supabase';

/**
 * =====================================================
 * ONBOARDING SERVICE
 * Manages employee onboarding workflow
 * =====================================================
 */

// =====================================================
// ONBOARDING PROFILES
// =====================================================

/**
 * Get all onboarding profiles
 */
export const getAllOnboardingProfiles = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ONBOARDING_PROFILES)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get onboarding profiles by status
 */
export const getOnboardingProfilesByStatus = async (status) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ONBOARDING_PROFILES)
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get onboarding profile by ID
 */
export const getOnboardingProfileById = async (id) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ONBOARDING_PROFILES)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get onboarding profile by token (for public access)
 */
export const getOnboardingProfileByToken = async (token) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ONBOARDING_PROFILES)
      .select('*')
      .eq('onboarding_token', token)
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    // Check if token is expired
    if (data.token_expires_at) {
      const expiryDate = new Date(data.token_expires_at);
      const now = new Date();
      
      if (now > expiryDate) {
        return {
          success: false,
          error: 'Onboarding link has expired. Please contact HR.',
        };
      }
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Create new onboarding profile
 */
export const createOnboardingProfile = async (profileData) => {
  try {
    // Generate unique token
    const token = `OB-${Math.random().toString(36).substring(2, 14).toUpperCase()}`;
    
    // Set token expiry (14 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 14);

    const { data, error } = await supabase
      .from(TABLES.ONBOARDING_PROFILES)
      .insert([
        {
          full_name: profileData.full_name,
          email: profileData.email,
          phone: profileData.phone,
          position: profileData.position,
          department: profileData.department,
          proposed_salary: profileData.proposed_salary,
          proposed_start_date: profileData.proposed_start_date,
          employment_type: profileData.employment_type || 'Full-time',
          onboarding_token: token,
          token_expires_at: expiryDate.toISOString(),
          status: 'draft',
          created_by: profileData.created_by,
        },
      ])
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data[0]);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Update onboarding profile
 */
export const updateOnboardingProfile = async (id, profileData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ONBOARDING_PROFILES)
      .update(profileData)
      .eq('id', id)
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data[0]);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Update onboarding profile by token (for candidate self-service)
 */
export const updateOnboardingProfileByToken = async (token, profileData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ONBOARDING_PROFILES)
      .update({
        ...profileData,
        form_submitted_at: new Date().toISOString(),
      })
      .eq('onboarding_token', token)
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data[0]);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Update onboarding status
 */
export const updateOnboardingStatus = async (id, status) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ONBOARDING_PROFILES)
      .update({ status })
      .eq('id', id)
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data[0]);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

const getInitials = (fullName) => {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'XX';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getPositionCode = (position) => {
  const parts = String(position || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'XX';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

/**
 * Approve onboarding and convert to employee
 */
export const approveOnboarding = async (id, approvedBy) => {
  try {
    // Get onboarding profile
    const profileResult = await getOnboardingProfileById(id);
    if (!profileResult.success) {
      return profileResult;
    }

    const profile = profileResult.data;

    // Generate employee code
    const { count: positionCount, error: countError } = await supabase
      .from(TABLES.EMPLOYEES)
      .select('id', { count: 'exact', head: true })
      .eq('position', profile.position);
    if (countError) {
      return handleSupabaseError(countError);
    }

    const sequence = String((positionCount || 0) + 1).padStart(3, '0');
    const employeeCode = `${getInitials(profile.full_name)}${getPositionCode(profile.position)}${sequence}`;

    // Create employee record
    const { data: employee, error: employeeError } = await supabase
      .from(TABLES.EMPLOYEES)
      .insert([
        {
          name: profile.full_name,
          email: profile.email,
          phone: profile.phone,
          position: profile.position,
          department: profile.department,
          salary: profile.proposed_salary,
          join_date: profile.proposed_start_date,
          date_of_birth: profile.date_of_birth,
          address: profile.address,
          emergency_contact_name: profile.emergency_contact_name,
          emergency_contact_phone: profile.emergency_contact_phone,
          marital_status: profile.marital_status,
          bank_name: profile.bank_name,
          bank_account: profile.bank_account,
          payment_mode: profile.payment_mode,
          employee_code: employeeCode,
          password: 'employee123', // Default password
          can_login: false, // Require password reset
          leave_balance: 20,
        },
      ])
      .select();

    if (employeeError) {
      return handleSupabaseError(employeeError);
    }

    // Update onboarding profile
    const { data, error } = await supabase
      .from(TABLES.ONBOARDING_PROFILES)
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: approvedBy,
        converted_employee_id: employee[0].id,
      })
      .eq('id', id)
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess({
      onboarding: data[0],
      employee: employee[0],
    });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Reject onboarding
 */
export const rejectOnboarding = async (id, reason, rejectedBy) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ONBOARDING_PROFILES)
      .update({
        status: 'rejected',
        rejection_reason: reason,
        approved_by: rejectedBy, // Using same field for tracking
      })
      .eq('id', id)
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data[0]);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Delete onboarding profile
 */
export const deleteOnboardingProfile = async (id) => {
  try {
    const { error } = await supabase
      .from(TABLES.ONBOARDING_PROFILES)
      .delete()
      .eq('id', id);

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess({ message: 'Onboarding profile deleted successfully' });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// =====================================================
// ONBOARDING DOCUMENTS
// =====================================================

/**
 * Upload document to Supabase Storage
 */
export const uploadOnboardingDocument = async (file, onboardingProfileId, documentType) => {
  try {
    // Create file path
    const timestamp = Date.now();
    const fileName = `${onboardingProfileId}/${documentType}_${timestamp}_${file.name}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('onboarding-documents')
      .upload(fileName, file);

    if (uploadError) {
      return handleSupabaseError(uploadError);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('onboarding-documents')
      .getPublicUrl(fileName);

    // Save document record
    const { data, error } = await supabase
      .from(TABLES.ONBOARDING_DOCUMENTS)
      .insert([
        {
          onboarding_profile_id: onboardingProfileId,
          document_type: documentType,
          document_name: file.name,
          file_path: uploadData.path,
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.type,
        },
      ])
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data[0]);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get documents for an onboarding profile
 */
export const getOnboardingDocuments = async (onboardingProfileId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ONBOARDING_DOCUMENTS)
      .select('*')
      .eq('onboarding_profile_id', onboardingProfileId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Delete document
 */
export const deleteOnboardingDocument = async (documentId) => {
  try {
    // Get document info first
    const { data: doc } = await supabase
      .from(TABLES.ONBOARDING_DOCUMENTS)
      .select('*')
      .eq('id', documentId)
      .single();

    if (doc) {
      // Delete from storage
      await supabase.storage
        .from('onboarding-documents')
        .remove([doc.file_path]);
    }

    // Delete from database
    const { error } = await supabase
      .from(TABLES.ONBOARDING_DOCUMENTS)
      .delete()
      .eq('id', documentId);

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess({ message: 'Document deleted successfully' });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// =====================================================
// STATISTICS & ANALYTICS
// =====================================================

/**
 * Get onboarding statistics
 */
export const getOnboardingStatistics = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ONBOARDING_PROFILES)
      .select('status');

    if (error) {
      return handleSupabaseError(error);
    }

    const stats = {
      total: data.length,
      draft: data.filter(p => p.status === 'draft').length,
      link_sent: data.filter(p => p.status === 'link_sent').length,
      form_submitted: data.filter(p => p.status === 'form_submitted').length,
      awaiting_references: data.filter(p => p.status === 'awaiting_references').length,
      references_received: data.filter(p => p.status === 'references_received').length,
      approved: data.filter(p => p.status === 'approved').length,
      rejected: data.filter(p => p.status === 'rejected').length,
      completed: data.filter(p => p.status === 'completed').length,
    };

    return handleSupabaseSuccess(stats);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Search onboarding profiles
 */
export const searchOnboardingProfiles = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.ONBOARDING_PROFILES)
      .select('*')
      .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,position.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};
