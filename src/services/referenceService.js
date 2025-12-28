import { supabase, TABLES, handleSupabaseError, handleSupabaseSuccess } from './supabase';
import { updateOnboardingStatus } from './onboardingService';

/**
 * =====================================================
 * REFERENCE SERVICE
 * Manages employment reference workflow
 * =====================================================
 */

// =====================================================
// REFERENCE REQUESTS
// =====================================================

/**
 * Create reference request
 */
export const createReferenceRequest = async (requestData) => {
  try {
    // Generate unique token
    const token = `REF-${Math.random().toString(36).substring(2, 14).toUpperCase()}`;
    
    // Set token expiry (14 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 14);

    const { data, error } = await supabase
      .from(TABLES.REFERENCE_REQUESTS)
      .insert([
        {
          onboarding_profile_id: requestData.onboarding_profile_id,
          referee_name: requestData.referee_name,
          referee_email: requestData.referee_email,
          referee_phone: requestData.referee_phone,
          company_name: requestData.company_name,
          referee_position: requestData.referee_position,
          relationship: requestData.relationship,
          request_token: token,
          token_expires_at: expiryDate.toISOString(),
          status: 'pending',
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
 * Get all reference requests for an onboarding profile
 */
export const getReferenceRequestsByProfile = async (onboardingProfileId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.REFERENCE_REQUESTS)
      .select('*')
      .eq('onboarding_profile_id', onboardingProfileId)
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
 * Get reference request by token (for public access)
 */
export const getReferenceRequestByToken = async (token) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.REFERENCE_REQUESTS)
      .select('*')
      .eq('request_token', token)
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
          error: 'This reference request link has expired. Please contact the requesting organization.',
        };
      }
    }

    // Check if already completed
    if (data.status === 'completed') {
      return {
        success: false,
        error: 'This reference has already been submitted. Thank you.',
      };
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Update reference request status
 */
export const updateReferenceRequestStatus = async (id, status) => {
  try {
    const updateData = { status };
    
    // Add timestamps based on status
    if (status === 'sent') {
      updateData.sent_at = new Date().toISOString();
    } else if (status === 'opened') {
      updateData.opened_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from(TABLES.REFERENCE_REQUESTS)
      .update(updateData)
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
 * Send reminder for reference request
 */
export const sendReferenceReminder = async (referenceRequestId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.REFERENCE_REQUESTS)
      .select('reminder_sent_count')
      .eq('id', referenceRequestId)
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    const newCount = (data.reminder_sent_count || 0) + 1;

    const { data: updateData, error: updateError } = await supabase
      .from(TABLES.REFERENCE_REQUESTS)
      .update({
        reminder_sent_count: newCount,
        last_reminder_sent_at: new Date().toISOString(),
      })
      .eq('id', referenceRequestId)
      .select();

    if (updateError) {
      return handleSupabaseError(updateError);
    }

    return handleSupabaseSuccess(updateData[0]);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Cancel reference request
 */
export const cancelReferenceRequest = async (id) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.REFERENCE_REQUESTS)
      .update({ status: 'cancelled' })
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
 * Delete reference request
 */
export const deleteReferenceRequest = async (id) => {
  try {
    const { error } = await supabase
      .from(TABLES.REFERENCE_REQUESTS)
      .delete()
      .eq('id', id);

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess({ message: 'Reference request deleted successfully' });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// =====================================================
// REFERENCES (Submitted Forms)
// =====================================================

/**
 * Submit reference form
 */
export const submitReference = async (referenceData) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.REFERENCES)
      .insert([
        {
          reference_request_id: referenceData.reference_request_id,
          onboarding_profile_id: referenceData.onboarding_profile_id,
          
          // Referee Info
          referee_name: referenceData.referee_name,
          referee_position: referenceData.referee_position,
          company_name: referenceData.company_name,
          referee_email: referenceData.referee_email,
          referee_phone: referenceData.referee_phone,
          
          // Employment Verification
          employment_confirmed: referenceData.employment_confirmed,
          employment_start_date: referenceData.employment_start_date,
          employment_end_date: referenceData.employment_end_date,
          job_title: referenceData.job_title,
          
          // Performance Ratings
          overall_performance_rating: referenceData.overall_performance_rating,
          reliability_rating: referenceData.reliability_rating,
          teamwork_rating: referenceData.teamwork_rating,
          communication_rating: referenceData.communication_rating,
          
          // Conduct
          conduct_issues: referenceData.conduct_issues || false,
          conduct_details: referenceData.conduct_details,
          
          // Re-employment
          would_rehire: referenceData.would_rehire,
          rehire_comments: referenceData.rehire_comments,
          
          // Additional Comments
          strengths: referenceData.strengths,
          areas_for_improvement: referenceData.areas_for_improvement,
          additional_comments: referenceData.additional_comments,
          
          // Verification
          declaration_accepted: referenceData.declaration_accepted,
          digital_signature: referenceData.digital_signature,
          
          // Metadata
          ip_address: referenceData.ip_address,
        },
      ])
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    // Update reference request status to 'completed'
    await updateReferenceRequestStatus(
      referenceData.reference_request_id,
      'completed'
    );

    const completionResult = await getReferenceCompletionStatus(referenceData.onboarding_profile_id);
    if (completionResult.success && completionResult.data.allCompleted) {
      await updateOnboardingStatus(referenceData.onboarding_profile_id, 'references_received');
    }

    return handleSupabaseSuccess(data[0]);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get all references for an onboarding profile
 */
export const getReferencesByProfile = async (onboardingProfileId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.REFERENCES)
      .select('*')
      .eq('onboarding_profile_id', onboardingProfileId)
      .order('submitted_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get reference by ID
 */
export const getReferenceById = async (id) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.REFERENCES)
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
 * Get reference by request ID
 */
export const getReferenceByRequestId = async (requestId) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.REFERENCES)
      .select('*')
      .eq('reference_request_id', requestId)
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// =====================================================
// ANALYTICS & UTILITIES
// =====================================================

/**
 * Get reference completion status for onboarding profile
 */
export const getReferenceCompletionStatus = async (onboardingProfileId) => {
  try {
    // Get all reference requests
    const requestsResult = await getReferenceRequestsByProfile(onboardingProfileId);
    if (!requestsResult.success) {
      return requestsResult;
    }

    const requests = requestsResult.data;
    const totalRequests = requests.length;
    const completedRequests = requests.filter(r => r.status === 'completed').length;
    const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'sent').length;

    return handleSupabaseSuccess({
      total: totalRequests,
      completed: completedRequests,
      pending: pendingRequests,
      percentage: totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0,
      allCompleted: totalRequests > 0 && completedRequests === totalRequests,
    });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get pending reference requests (for reminder system)
 */
export const getPendingReferenceRequests = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.REFERENCE_REQUESTS)
      .select('*')
      .in('status', ['pending', 'sent', 'opened'])
      .order('created_at', { ascending: true });

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Mark reference link as opened (track when referee clicks link)
 */
export const markReferenceAsOpened = async (token) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.REFERENCE_REQUESTS)
      .update({
        status: 'opened',
        opened_at: new Date().toISOString(),
      })
      .eq('request_token', token)
      .eq('status', 'sent') // Only update if status is 'sent'
      .select();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data[0] || null);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

/**
 * Get reference statistics
 */
export const getReferenceStatistics = async () => {
  try {
    const { data: requests, error: requestsError } = await supabase
      .from(TABLES.REFERENCE_REQUESTS)
      .select('status');

    if (requestsError) {
      return handleSupabaseError(requestsError);
    }

    const { data: references, error: referencesError } = await supabase
      .from(TABLES.REFERENCES)
      .select('overall_performance_rating, would_rehire');

    if (referencesError) {
      return handleSupabaseError(referencesError);
    }

    const stats = {
      totalRequests: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      sent: requests.filter(r => r.status === 'sent').length,
      opened: requests.filter(r => r.status === 'opened').length,
      completed: requests.filter(r => r.status === 'completed').length,
      expired: requests.filter(r => r.status === 'expired').length,
      cancelled: requests.filter(r => r.status === 'cancelled').length,
      
      // Reference insights
      totalReferences: references.length,
      averageRating: references.length > 0
        ? (references.reduce((sum, r) => sum + (r.overall_performance_rating || 0), 0) / references.length).toFixed(1)
        : 0,
      wouldRehireCount: references.filter(r => r.would_rehire === true).length,
      wouldNotRehireCount: references.filter(r => r.would_rehire === false).length,
    };

    return handleSupabaseSuccess(stats);
  } catch (error) {
    return handleSupabaseError(error);
  }
};
