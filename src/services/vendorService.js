import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from './supabase';
import { notifyVendorSubmission } from './notificationAPI';

/**
 * Create a new vendor sourcing entry and notify managers/admins
 */
export const createVendorResponse = async (payload, submitterId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.VENDOR_RESPONSES)
      .insert([{
        entry_id: payload.entry_id,
        marketer_name: payload.marketer_name,
        marketer_phone: payload.marketer_phone,
        marketer_email: payload.marketer_email,
        vendor_name: payload.vendor_name,
        contact_person: payload.contact_person,
        vendor_phone: payload.vendor_phone,
        vendor_email: payload.vendor_email,
        business_address: payload.business_address,
        category: payload.category,
        sells_online: payload.sells_online,
        where_online: payload.where_online,
        interest: payload.interest,
        onboarding: payload.onboarding,
        challenges: payload.challenges,
        comments: payload.comments,
        device: payload.device,
        image_links: payload.image_links || null,
      }])
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    const response = data[0];

    // Notify managers and admins (skip the submitter)
    try {
      const { data: managers } = await supabase
        .from(TABLES.EMPLOYEES)
        .select('id')
        .eq('is_manager', true);
      const { data: admins } = await supabase
        .from(TABLES.ADMIN_USERS)
        .select('id');
      const recipientIds = [
        ...(managers || []).map((m) => m.id),
        ...(admins || []).map((a) => a.id),
      ].filter((id) => id && id !== submitterId);

      if (recipientIds.length > 0) {
        await notifyVendorSubmission(recipientIds, response);
      }
    } catch (notificationError) {
      console.warn('Vendor notification error:', notificationError);
    }

    return handleSupabaseSuccess(response);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get all vendor sourcing entries
 */
export const getVendorResponses = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.VENDOR_RESPONSES)
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
