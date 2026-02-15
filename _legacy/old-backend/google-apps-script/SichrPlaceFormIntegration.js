/**
 * SichrPlace Google Forms Integration
 * Form ID: 1FAIpQLSeVIwDpdA5ySzHFefkwTtdZalmmtacLZwQZa7duNRPIcaFo4Q
 * Automatically sends form submissions to SichrPlace webhook
 */

// Configuration - UPDATE THE WEBHOOK_URL FOR PRODUCTION
const CONFIG = {
  // Your SichrPlace server URL - UPDATE THIS FOR PRODUCTION!
  WEBHOOK_URL: 'http://localhost:3000/api/google-forms/google-forms-webhook',
  
  // Your Form ID (extracted from your URL)
  FORM_ID: '1FAIpQLSeVIwDpdA5ySzHFefkwTtdZalmmtacLZwQZa7duNRPIcaFo4Q',
  
  // Set to true for testing, false for production
  DEBUG_MODE: true
};

/**
 * This function is triggered when a form is submitted
 */
function onFormSubmit(e) {
  try {
    console.log('📋 SichrPlace form submission received');
    
    if (CONFIG.DEBUG_MODE) {
      console.log('Raw form response:', JSON.stringify(e, null, 2));
    }
    
    // Get form and response data
    const form = FormApp.getActiveForm();
    const formResponse = e.response;
    const items = formResponse.getItemResponses();
    
    // Extract form metadata
    const formId = form.getId();
    const responseId = formResponse.getId();
    const timestamp = formResponse.getTimestamp();
    const respondentEmail = formResponse.getRespondentEmail();
    
    console.log('📊 Form metadata:', {
      formId: formId,
      responseId: responseId,
      timestamp: timestamp,
      respondentEmail: respondentEmail
    });
    
    // Process form data
    const formData = processFormData(items, formId, responseId, timestamp, respondentEmail);
    
    // Send to SichrPlace webhook
    const result = sendToSichrPlace(formData);
    
    if (result.success) {
      console.log('✅ Successfully sent to SichrPlace:', result.response);
    } else {
      console.error('❌ Failed to send to SichrPlace:', result.error);
      
      // Send error notification
      sendErrorNotification(result.error, formData);
    }
    
  } catch (error) {
    console.error('❌ Error in onFormSubmit:', error);
    sendErrorNotification(error, e);
  }
}

/**
 * Process form responses into SichrPlace format
 */
function processFormData(items, formId, responseId, timestamp, respondentEmail) {
  const data = {
    // Form metadata
    google_form_id: formId,
    google_response_id: responseId,
    timestamp: timestamp.toISOString(),
    
    // Default values - will be filled from form responses
    tenant_name: '',
    tenant_email: respondentEmail || '',
    tenant_phone: '',
    apartment_address: '',
    apartment_id: '',
    requested_date: '',
    preferred_time_range: '',
    additional_info: '',
    budget_range: '',
    additional_guests: '0'
  };
  
  // Map form responses to webhook fields
  items.forEach((item, index) => {
    const question = item.getItem().getTitle().toLowerCase();
    const response = item.getResponse();
    
    if (CONFIG.DEBUG_MODE) {
      console.log(`Question ${index + 1}: "${question}" = "${response}"`);
    }
    
    // Map questions to webhook fields based on your form structure
    if (question.includes('full name') || question.includes('name')) {
      data.tenant_name = response;
    }
    else if (question.includes('email')) {
      data.tenant_email = response;
    }
    else if (question.includes('phone')) {
      data.tenant_phone = response;
    }
    else if (question.includes('apartment address')) {
      data.apartment_address = response;
    }
    else if (question.includes('apartment') && (question.includes('id') || question.includes('reference'))) {
      data.apartment_id = response || `form-${Date.now()}`;
    }
    else if (question.includes('viewing date') || question.includes('preferred') && question.includes('date')) {
      // Convert date to YYYY-MM-DD format
      try {
        const date = new Date(response);
        data.requested_date = date.toISOString().split('T')[0];
      } catch (e) {
        console.warn('Date parsing failed, using raw response:', response);
        data.requested_date = response;
      }
    }
    else if (question.includes('time') && question.includes('range')) {
      data.preferred_time_range = response;
    }
    else if (question.includes('additional information')) {
      data.additional_info = response;
    }
    else if (question.includes('budget')) {
      data.budget_range = response;
    }
    else if (question.includes('guests') || question.includes('additional guests')) {
      // Extract number from response (e.g., "1" from "1" or "0 (Just me)")
      const match = response.toString().match(/\d+/);
      data.additional_guests = match ? match[0] : '0';
    }
  });
  
  // Generate apartment_id if not provided
  if (!data.apartment_id) {
    data.apartment_id = `form-${Date.now()}`;
  }
  
  // Validate required fields
  const requiredFields = ['tenant_name', 'tenant_email', 'tenant_phone', 'apartment_address', 'requested_date', 'preferred_time_range', 'budget_range'];
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    console.warn('⚠️ Missing required fields:', missingFields);
  }
  
  if (CONFIG.DEBUG_MODE) {
    console.log('📊 Final processed form data:', JSON.stringify(data, null, 2));
  }
  
  return data;
}

/**
 * Send data to SichrPlace webhook
 */
function sendToSichrPlace(formData) {
  try {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SichrPlace-GoogleForms/1.0'
      },
      payload: JSON.stringify(formData)
    };
    
    console.log('🚀 Sending to SichrPlace:', CONFIG.WEBHOOK_URL);
    
    const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log(`📡 Response: ${statusCode} - ${responseText}`);
    
    if (statusCode === 200) {
      try {
        return {
          success: true,
          response: JSON.parse(responseText)
        };
      } catch (e) {
        return {
          success: true,
          response: responseText
        };
      }
    } else {
      return {
        success: false,
        error: `HTTP ${statusCode}: ${responseText}`
      };
    }
    
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Send error notification email to admin
 */
function sendErrorNotification(error, formData) {
  try {
    const subject = '❌ SichrPlace Form Integration Error';
    const body = `
SichrPlace Google Forms Integration Error:

Error: ${error.toString()}
Time: ${new Date().toISOString()}
Form: SichrPlace - Apartment Viewing Request
Form ID: ${CONFIG.FORM_ID}

Form Data:
${JSON.stringify(formData, null, 2)}

Please check the webhook endpoint and server status.
    `;
    
    // Send email to admin (uncomment and update email when ready)
    // MailApp.sendEmail('sichrplace@gmail.com', subject, body);
    
    console.error('📧 Error notification prepared (email disabled for now)');
  } catch (e) {
    console.error('Failed to prepare error notification:', e);
  }
}

/**
 * Test function - run this to test your webhook connection
 */
function testWebhook() {
  console.log('🧪 Testing SichrPlace webhook connection...');
  
  const testData = {
    google_form_id: CONFIG.FORM_ID,
    google_response_id: 'test_response_' + Date.now(),
    timestamp: new Date().toISOString(),
    tenant_name: 'Test User Script',
    tenant_email: 'sichrplace@gmail.com', 
    tenant_phone: '+49 123 456789',
    apartment_address: 'Test Street 123, 50667 Köln',
    apartment_id: 'test-apartment-script-' + Date.now(),
    requested_date: '2025-08-01',
    preferred_time_range: '14:00-16:00',
    additional_info: 'This is a test submission from Google Apps Script',
    budget_range: '€800-1200',
    additional_guests: '1'
  };
  
  console.log('🧪 Test data:', JSON.stringify(testData, null, 2));
  
  const result = sendToSichrPlace(testData);
  
  if (result.success) {
    console.log('✅ Webhook test successful!', result.response);
  } else {
    console.log('❌ Webhook test failed:', result.error);
  }
  
  return result;
}

/**
 * Setup function - run this to configure the form trigger
 */
function setupFormTrigger() {
  try {
    // Delete existing triggers for this form
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onFormSubmit') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create new form submit trigger
    const form = FormApp.openById(CONFIG.FORM_ID);
    const trigger = ScriptApp.newTrigger('onFormSubmit')
      .onFormSubmit(form)
      .create();
    
    console.log('✅ Form trigger created successfully!');
    console.log('Trigger ID:', trigger.getUniqueId());
    
    return {
      success: true,
      triggerId: trigger.getUniqueId()
    };
    
  } catch (error) {
    console.error('❌ Failed to setup form trigger:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}
