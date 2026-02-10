/**
 * @OnlyCurrentDoc
 */

// Constants
var API_BASE_URL = "http://localhost:8000/api/v1";

/**
 * onOpen
 * Creates the custom menu when the spreadsheet opens.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Risk Modeling')
      .addItem('Open Sidebar', 'showSidebar')
      .addSeparator()
      .addItem('Calculate VaR (Selected Range)', 'calculateVaRFromSelection')
      .addToUi();
}

/**
 * showSidebar
 * Opens the HTML sidebar.
 */
function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setTitle('Risk Modeling Platform')
      .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * getSelectedData
 * Helper to get data from current selection.
 * Called by client-side JavaScript.
 */
function getSelectedData() {
  var selection = SpreadsheetApp.getActiveRange();
  if (!selection) {
    throw new Error('No range selected.');
  }
  var values = selection.getValues();
  // Flatten and filter for numbers
  var returns = [].concat.apply([], values).filter(function(v) {
    return typeof v === 'number' && !isNaN(v);
  });
  
  return returns;
}

/**
 * calculateVaR
 * Calls the external Python API to calculate VaR.
 */
function calculateVaR(params) {
  var url = API_BASE_URL + "/var/calculate";
  
  var payload = {
    "portfolio_value": params.portfolio_value,
    "confidence_level": params.confidence_level,
    "time_horizon": params.time_horizon,
    "method": params.method,
    "returns": params.returns
  };
  
  var options = {
    'method' : 'post',
    'contentType': 'application/json',
    'payload' : JSON.stringify(payload),
    'muteHttpExceptions': true
  };
  
  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseBody = response.getContentText();
    
    if (responseCode !== 200) {
      throw new Error('API Error: ' + responseBody);
    }
    
    return JSON.parse(responseBody);
    
  } catch (e) {
    Logger.log('Error calling API: ' + e.toString());
    throw new Error('Failed to calculate VaR: ' + e.toString());
  }
}
