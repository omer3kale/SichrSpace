/**
 * Google Apps Script for SichrPlace Google Forms Integration
 * 
 * Instructions:
 * 1. Create a Google Form for apartment viewing requests
 * 2. Create a Google Sheet to collect responses
 * 3. Open Google Apps Script (script.google.com)
 * 4. Paste this code and save
 * 5. Set up trigger to run onFormSubmit when form is submitted
 * 
 * This script will automatically send form responses to your SichrPlace backend
 */

// Configuration - Update these with your actual values
const CONFIG = {
  // Your SichrPlace backend URL
  WEBHOOK_URL: 'http://localhost:3000/api/google-forms/google-forms-webhook', // Change to your production URL
  // Your Google Form ID (get from form URL)
  FORM_ID: 'YOUR_GOOGLE_FORM_ID_HERE',
  // Your Google Sheet ID (get from sheet URL) 
  SHEET_ID: 'YOUR_GOOGLE_SHEET_ID_HERE'
};

/**
 * This function runs automatically when someone submits your Google Form
 * Make sure to set up a trigger for this function
 */
function onFormSubmit(e) {
  try {
    console.log('📋 Form submitted, processing...');
    
    // Get form response data
    const formResponse = e.response;
    const itemResponses = formResponse.getItemResponses();
    
    // Process form data
    const formData = processFormData(itemResponses, formResponse);
    
    // Send to SichrPlace backend
    const response = sendToSichrPlace(formData);
    
    // Log success
    console.log('✅ Successfully sent to SichrPlace:', response);
    
    // Optional: Update Google Sheet with processing status
    updateSheetWithStatus(formResponse, 'processed', response);
    
  } catch (error) {
    console.error('❌ Error processing form submission:', error);
    
    // Optional: Update Google Sheet with error status
    try {
      updateSheetWithStatus(e.response, 'error', { error: error.toString() });
    } catch (updateError) {
      console.error('Failed to update sheet with error status:', updateError);
    }
  }
}

/**
 * Process form responses and map to SichrPlace format
 */
function processFormData(itemResponses, formResponse) {
  const data = {
    // Meta information
    timestamp: formResponse.getTimestamp().toISOString(),
    form_id: CONFIG.FORM_ID,
    response_id: formResponse.getId(),
    
    // Initialize data object
    responses: {}
  };
  
  // Map form responses to field names
  itemResponses.forEach(itemResponse => {
    const question = itemResponse.getItem().getTitle().toLowerCase();
    const answer = itemResponse.getResponse();
    
    // Map questions to database fields
    // Adjust these mappings based on your actual Google Form questions
    if (question.includes('name') || question.includes('full name')) {
      data.name = answer;
    } else if (question.includes('email')) {
      data.email = answer;
    } else if (question.includes('phone') || question.includes('telephone')) {
      data.phone = answer;
    } else if (question.includes('apartment') && question.includes('address')) {
      data.apartment_address = answer;
    } else if (question.includes('viewing date') || question.includes('preferred date')) {
      data.viewing_date = answer;
    } else if (question.includes('time') || question.includes('preferred time')) {
      data.time_preference = answer;
    } else if (question.includes('message') || question.includes('additional info')) {
      data.message = answer;
    } else if (question.includes('special requirements') || question.includes('requirements')) {
      data.special_requirements = answer;
    } else if (question.includes('guests') || question.includes('additional guests')) {
      data.additional_guests = answer;
    } else if (question.includes('budget')) {
      data.budget_range = answer;
    } else if (question.includes('move') && question.includes('date')) {
      data.move_in_date = answer;
    }
    
    // Store original responses for debugging
    data.responses[question] = answer;
  });
  
  console.log('📊 Processed form data:', data);
  return data;
}

/**
 * Send form data to SichrPlace backend via webhook
 */
function sendToSichrPlace(formData) {
  try {
    const payload = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Google-Apps-Script/SichrPlace-Integration'
      },
      payload: JSON.stringify(formData)
    };
    
    console.log('🔗 Sending to SichrPlace webhook:', CONFIG.WEBHOOK_URL);
    
    const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, payload);
    const responseText = response.getContentText();
    const responseCode = response.getResponseCode();
    
    console.log('📡 Webhook response code:', responseCode);
    console.log('📡 Webhook response:', responseText);
    
    if (responseCode >= 200 && responseCode < 300) {
      return JSON.parse(responseText);
    } else {
      throw new Error(`HTTP ${responseCode}: ${responseText}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to send to SichrPlace:', error);
    throw error;
  }
}

/**
 * Update Google Sheet with processing status
 */
function updateSheetWithStatus(formResponse, status, responseData) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheets()[0];
    const timestamp = formResponse.getTimestamp();
    
    // Find the row with this timestamp
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    
    for (let i = 1; i < data.length; i++) { // Start from 1 to skip header
      if (data[i][0] && new Date(data[i][0]).getTime() === timestamp.getTime()) {
        rowIndex = i + 1; // +1 because getRange is 1-indexed
        break;
      }
    }
    
    if (rowIndex > 0) {
      // Add status columns if they don't exist
      const lastColumn = sheet.getLastColumn();
      const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      
      let statusColumn = headers.indexOf('SichrPlace Status') + 1;
      let responseColumn = headers.indexOf('SichrPlace Response') + 1;
      
      if (statusColumn === 0) {
        statusColumn = lastColumn + 1;
        sheet.getRange(1, statusColumn).setValue('SichrPlace Status');
      }
      
      if (responseColumn === 0) {
        responseColumn = lastColumn + 2;
        sheet.getRange(1, responseColumn).setValue('SichrPlace Response');
      }
      
      // Update status
      sheet.getRange(rowIndex, statusColumn).setValue(status);
      sheet.getRange(rowIndex, responseColumn).setValue(JSON.stringify(responseData));
      
      console.log(`✅ Updated sheet row ${rowIndex} with status: ${status}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to update sheet:', error);
  }
}

/**
 * Test function - run this manually to test the integration
 */
function testIntegration() {
  console.log('🧪 Testing SichrPlace integration...');
  
  const testData = {
    timestamp: new Date().toISOString(),
    form_id: CONFIG.FORM_ID,
    response_id: 'test_response_' + Date.now(),
    name: 'Test User',
    email: 'sichrplace@gmail.com',
    phone: '+49 123 456789',
    apartment_address: 'Teststraße 123, 50667 Köln',
    viewing_date: '2025-08-15',
    time_preference: '14:00-16:00',
    message: 'This is a test submission from Google Apps Script',
    additional_guests: '1'
  };
  
  try {
    const response = sendToSichrPlace(testData);
    console.log('✅ Test successful:', response);
    return response;
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

/**
 * Setup function - run this once to create the form submit trigger
 */
function setupTrigger() {
  try {
    // Delete existing triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onFormSubmit') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create new trigger
    const form = FormApp.openById(CONFIG.FORM_ID);
    ScriptApp.newTrigger('onFormSubmit')
      .forForm(form)
      .onFormSubmit()
      .create();
      
    console.log('✅ Trigger created successfully');
    
  } catch (error) {
    console.error('❌ Failed to setup trigger:', error);
    throw error;
  }
}

/**
 * Get form questions - helper function to see your form structure
 */
function getFormQuestions() {
  try {
    const form = FormApp.openById(CONFIG.FORM_ID);
    const items = form.getItems();
    
    console.log('📋 Form questions:');
    items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.getTitle()} (${item.getType()})`);
    });
    
    return items.map(item => ({
      title: item.getTitle(),
      type: item.getType().toString()
    }));
    
  } catch (error) {
    console.error('❌ Failed to get form questions:', error);
    throw error;
  }
}
