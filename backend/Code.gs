/**
 * ============================================================================
 * ACCOUNTS TASK MANAGEMENT SYSTEM — GOOGLE APPS SCRIPT BACKEND
 * ============================================================================
 * 
 * Version: 1.0.0-PROD
 * Department: Accounts & Finance (Industrial Manufacturing Plant)
 * Timezone: Asia/Kolkata (IST)
 * 
 * Instructions:
 * 1. Open your target Google Sheet.
 * 2. Click Extensions -> Apps Script.
 * 3. Replace any code with this entire file.
 * 4. Run setupAccountsTaskSystem() from the dropdown menu above.
 * 5. Click Deploy -> New deployment -> Select type: Web App.
 *    - Description: Accounts Task API v1
 *    - Execute as: Me (your Google account)
 *    - Who has access: Anyone (or Anyone with Google Account depending on domain)
 * 6. Copy the Web App URL and paste it into the React App settings!
 * ============================================================================
 */

// Global Constants
var TIMEZONE = "Asia/Kolkata";
var FOLDER_NAME = "Accounts_Task_Attachments";
var SHEET_NAMES = {
  TASKS: "TASKS",
  EMPLOYEES: "EMPLOYEES",
  TASK_HISTORY: "TASK_HISTORY",
  EXTENSION_REQUESTS: "EXTENSION_REQUESTS",
  EMPLOYEE_SCORECARD: "EMPLOYEE_SCORECARD",
  APP_CONFIG: "APP_CONFIG"
};

var HEADERS = {
  TASKS: [
    "Task_ID", "Created_At", "Created_By", "Created_By_Email", "Department",
    "Task_Title", "Task_Description", "Assigned_To", "Assigned_To_Email",
    "Priority", "Task_Type", "Start_Date", "Start_Time", "Deadline_Date",
    "Deadline_Time", "Is_Hourly_Task", "Estimated_Duration_Hours", "Status",
    "Attachment_URLs", "Completion_Notes", "Completed_At", "Completed_By",
    "Original_Deadline", "Current_Deadline", "Extension_Status",
    "Approved_Extension_Deadline", "Approved_By", "Approved_At",
    "Points_Awarded", "Points_Reason", "Updated_At", "Is_Archived",
    "Request_Source", "Requesting_Department", "Requester_Name", "Requester_Email",
    "Requester_Contact", "Reference_Number", "Requested_Priority", "Requested_Start_Date",
    "Requested_Deadline", "Assigned_By", "Assigned_At", "Assignment_Notes"
  ],
  EMPLOYEES: [
    "Employee_ID", "Employee_Name", "Email", "Department", "Role", "Is_Active", "Created_At"
  ],
  TASK_HISTORY: [
    "History_ID", "Task_ID", "Action", "Old_Value", "New_Value",
    "Performed_By", "Performed_By_Email", "Timestamp", "Remarks"
  ],
  EXTENSION_REQUESTS: [
    "Request_ID", "Task_ID", "Requested_By", "Requested_At", "Old_Deadline",
    "Requested_Deadline", "Reason", "Status", "Reviewed_By", "Reviewed_At", "Review_Comments"
  ],
  EMPLOYEE_SCORECARD: [
    "Employee_ID", "Employee_Name", "Total_Tasks_Assigned", "Total_Tasks_Completed",
    "On_Time_Completions", "Late_Completions", "Approved_Extension_Completions",
    "Total_Points", "Updated_At"
  ],
  APP_CONFIG: [
    "Config_Key", "Config_Value", "Description"
  ]
};

/**
 * Adds custom admin menu to Google Sheets UI
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("⚙️ Accounts Task App")
    .addItem("🚀 Initialize / Verify Database", "setupAccountsTaskSystem")
    .addItem("📊 Recalculate All Scorecards", "recalculateAllScorecards")
    .addSeparator()
    .addItem("ℹ️ Web App Deployment Guide", "showDeploymentHelp")
    .addToUi();
}

/**
 * 4. GOOGLE SHEETS DATABASE INITIALIZATION
 * Idempotent: Never deletes data, safe to run multiple times.
 */
function setupAccountsTaskSystem() {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 30 sec lock
  } catch (e) {
    Logger.log("Lock acquisition failed: " + e);
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var spreadsheetId = ss.getId();
    var createdSheets = [];
    var existingSheets = [];

    // 1. Initialize all required tabs & headers
    for (var key in SHEET_NAMES) {
      var sheetName = SHEET_NAMES[key];
      var sheet = ss.getSheetByName(sheetName);
      var expectedHeaders = HEADERS[key];

      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(expectedHeaders);
        formatHeaderRow(sheet, expectedHeaders.length);
        createdSheets.push(sheetName);
      } else {
        existingSheets.push(sheetName);
        // Verify headers are present on row 1
        var lastCol = sheet.getLastColumn();
        if (lastCol === 0) {
          sheet.appendRow(expectedHeaders);
          formatHeaderRow(sheet, expectedHeaders.length);
        } else {
          var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
          // Check if any missing headers
          var missing = [];
          for (var i = 0; i < expectedHeaders.length; i++) {
            if (currentHeaders.indexOf(expectedHeaders[i]) === -1) {
              missing.push(expectedHeaders[i]);
            }
          }
          if (missing.length > 0) {
            sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
            formatHeaderRow(sheet, sheet.getLastColumn());
          }
        }
      }
    }

    // 2. Setup Google Drive Attachments folder
    var folderId = "";
    try {
      var folders = DriveApp.getFoldersByName(FOLDER_NAME);
      if (folders.hasNext()) {
        folderId = folders.next().getId();
      } else {
        var newFolder = DriveApp.createFolder(FOLDER_NAME);
        folderId = newFolder.getId();
      }
    } catch (driveErr) {
      Logger.log("Drive folder creation notice: " + driveErr);
    }

    // 3. Populate APP_CONFIG defaults if empty
    var configSheet = ss.getSheetByName(SHEET_NAMES.APP_CONFIG);
    if (configSheet.getLastRow() <= 1) {
      var defaultConfigs = [
        ["SPREADSHEET_ID", spreadsheetId, "Google Sheet Database ID"],
        ["ATTACHMENTS_FOLDER_ID", folderId, "Google Drive folder for task files"],
        ["DEPARTMENT_NAME", "Accounts & Finance", "Industrial plant department name"],
        ["TIMEZONE", TIMEZONE, "Operating timezone (Asia/Kolkata)"],
        ["POINTS_ON_TIME", "5", "Points for completing on or before effective deadline"],
        ["POINTS_LATE", "0", "Points for late completions"],
        ["AUTO_REFRESH_INTERVAL_SEC", "20", "Live TV task board refresh interval in seconds"],
        ["APP_VERSION", "1.0.0-PROD", "System version"]
      ];
      for (var c = 0; c < defaultConfigs.length; c++) {
        configSheet.appendRow(defaultConfigs[c]);
      }
    }

    // 4. Seed initial industrial accounts employees if EMPLOYEES sheet is empty
    var empSheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEES);
    if (empSheet.getLastRow() <= 1) {
      var initialEmployees = [
        ["EMP-001", "Rajesh Sharma", "rajesh.sharma@manufacturing.industrial.com", "Accounts & Finance", "Administrator", true, new Date().toISOString()],
        ["EMP-002", "Priya Nair", "priya.nair@manufacturing.industrial.com", "Accounts & Finance", "Manager", true, new Date().toISOString()],
        ["EMP-003", "Amit Patel", "amit.patel@manufacturing.industrial.com", "Accounts & Finance", "Employee", true, new Date().toISOString()],
        ["EMP-004", "Sunita Rao", "sunita.rao@manufacturing.industrial.com", "Accounts & Finance", "Employee", true, new Date().toISOString()],
        ["EMP-005", "Vikram Singh", "vikram.singh@manufacturing.industrial.com", "Accounts & Finance", "Employee", true, new Date().toISOString()],
        ["EMP-006", "Neha Joshi", "neha.joshi@manufacturing.industrial.com", "Accounts & Finance", "Employee", true, new Date().toISOString()]
      ];
      for (var e = 0; e < initialEmployees.length; e++) {
        empSheet.appendRow(initialEmployees[e]);
      }
      // Populate corresponding scorecards
      var scoreSheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEE_SCORECARD);
      for (var s = 0; s < initialEmployees.length; s++) {
        scoreSheet.appendRow([
          initialEmployees[s][0], // ID
          initialEmployees[s][1], // Name
          0, 0, 0, 0, 0, 0,       // Assigned, Completed, OnTime, Late, ExtDone, Points
          new Date().toISOString()
        ]);
      }
    }

    var resultMsg = "Accounts Task Management System successfully initialized!\n\n" +
      "• Spreadsheet ID: " + spreadsheetId + "\n" +
      "• Drive Folder ID: " + (folderId || "Created") + "\n" +
      "• Tabs Configured: " + Object.keys(SHEET_NAMES).join(", ") + "\n" +
      "• Timezone: Asia/Kolkata (IST)\n\n" +
      "Next step: Click 'Deploy' -> 'New deployment' -> 'Web App' to generate your API URL.";

    Logger.log(resultMsg);
    try {
      SpreadsheetApp.getUi().alert("Setup Completed Successfully", resultMsg, SpreadsheetApp.getUi().ButtonSet.OK);
    } catch (ignore) {}

    return {
      success: true,
      message: "Database initialized successfully",
      spreadsheetId: spreadsheetId,
      attachmentsFolderId: folderId
    };
  } finally {
    try { lock.releaseLock(); } catch(e){}
  }
}

/**
 * Formats header rows with professional styling
 */
function formatHeaderRow(sheet, numCols) {
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setBackground("#202A38")
             .setFontColor("#FFFFFF")
             .setFontWeight("bold")
             .setFontFamily("Arial");
  sheet.setFrozenRows(1);
}

/**
 * Shows web app deployment instructions
 */
function showDeploymentHelp() {
  var html = HtmlService.createHtmlOutput(
    "<div style='font-family:sans-serif; padding:15px; line-height:1.6;'>" +
    "<h3>Deploying Accounts Task Web App API</h3>" +
    "<ol>" +
    "<li>Click the blue <b>Deploy</b> button at the top right.</li>" +
    "<li>Select <b>New deployment</b>.</li>" +
    "<li>Click the gear icon next to 'Select type' and choose <b>Web app</b>.</li>" +
    "<li>Set <b>Execute as</b>: <i>Me (your account)</i>.</li>" +
    "<li>Set <b>Who has access</b>: <i>Anyone</i>.</li>" +
    "<li>Click <b>Deploy</b> and copy the <b>Web app URL</b>.</li>" +
    "<li>Paste this URL into your Accounts Task System settings modal.</li>" +
    "</ol>" +
    "</div>"
  ).setWidth(500).setHeight(360);
  SpreadsheetApp.getUi().showModalDialog(html, "Web App Deployment Guide");
}

// ============================================================================
// WEB APP API ROUTING (doGet & doPost)
// ============================================================================

/**
 * Handles HTTP GET requests (Health check, Bootstrap, Active tasks, etc.)
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "healthCheck";
  var callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : null;
  var response = {};

  try {
    switch (action) {
      case "healthCheck":
      case "ping":
        response = {
          success: true,
          status: "healthy",
          timestamp: new Date().toISOString(),
          serverTimeIST: Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss 'IST'"),
          timezone: TIMEZONE,
          version: "1.0.0-PROD"
        };
        break;

      case "getAppBootstrap":
        response = getAppBootstrapData(e.parameter.userEmail);
        break;

      case "getActiveTasks":
        response = getActiveTasksList();
        break;

      case "getAllTasks":
        response = getAllTasksList();
        break;

      case "getEmployeeScorecard":
        response = getEmployeeScorecardData();
        break;

      case "getExtensionRequests":
        response = getExtensionRequestsList();
        break;

      case "getTaskHistory":
        response = getTaskHistoryList(e.parameter.taskId);
        break;

      default:
        response = {
          success: false,
          error: "Unknown action: " + action
        };
    }
  } catch (err) {
    response = {
      success: false,
      error: err.toString(),
      stack: err.stack
    };
  }

  var outputText = JSON.stringify(response);
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + outputText + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(outputText)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles HTTP POST requests (Create task, status update, extension, completion)
 */
function doPost(e) {
  var response = {};
  var lock = LockService.getScriptLock();

  try {
    // Acquire lock to guarantee atomic ID generation and prevents race conditions
    lock.waitLock(30000);

    var requestData = {};
    if (e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      requestData = e.parameter;
    }

    var action = requestData.action;
    var payload = requestData.payload || {};
    var authUser = requestData.authUser || {};

    switch (action) {
      case "healthCheck":
        response = { success: true, status: "healthy", timestamp: new Date().toISOString() };
        break;

      case "createTask":
        response = handleCreateTask(payload, authUser);
        break;

      case "updateTaskStatus":
        response = handleUpdateTaskStatus(payload, authUser);
        break;

      case "requestTaskExtension":
        response = handleRequestTaskExtension(payload, authUser);
        break;

      case "reviewTaskExtension":
        response = handleReviewTaskExtension(payload, authUser);
        break;

      case "completeTask":
        response = handleCompleteTask(payload, authUser);
        break;

      case "uploadAttachment":
        response = handleUploadAttachment(payload, authUser);
        break;

      case "submitExternalTask":
        response = handleSubmitExternalTask(payload, authUser);
        break;

      case "assignTask":
        response = handleAssignTask(payload, authUser);
        break;

      case "cancelTask":
        response = handleCancelTask(payload, authUser);
        break;

      default:
        response = { success: false, error: "Unsupported POST action: " + action };
    }
  } catch (err) {
    response = {
      success: false,
      error: err.toString(),
      stack: err.stack
    };
  } finally {
    try { lock.releaseLock(); } catch(e){}
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// DATA ACCESS & ACTION HANDLERS
// ============================================================================

/**
 * Returns bootstrap data required for frontend start:
 * Employees, Config, Active Tasks summary, User permissions
 */
function getAppBootstrapData(userEmail) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var empSheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEES);
  var configSheet = ss.getSheetByName(SHEET_NAMES.APP_CONFIG);

  var employees = sheetToObjects(empSheet);
  var configs = sheetToObjects(configSheet);

  var activeTasks = getActiveTasksList().data || [];
  var scorecards = getEmployeeScorecardData().data || [];
  var extensions = getExtensionRequestsList().data || [];

  return {
    success: true,
    data: {
      employees: employees,
      config: configs,
      activeTasks: activeTasks,
      scorecards: scorecards,
      pendingExtensions: extensions.filter(function(r) { return r.Status === "Pending"; }),
      serverTimeIST: Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss 'IST'")
    }
  };
}

/**
 * 7. LIVE TASK BOARD DATA
 * Returns only ACTIVE tasks (excluding Completed and Cancelled tasks)
 */
function getActiveTasksList() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var taskSheet = ss.getSheetByName(SHEET_NAMES.TASKS);
  var allTasks = sheetToObjects(taskSheet);

  var activeTasks = allTasks.filter(function(task) {
    var status = String(task.Status || "").trim();
    var isArchived = (task.Is_Archived === true || task.Is_Archived === "true" || task.Is_Archived === 1);
    return !isArchived && status !== "Completed" && status !== "Cancelled";
  });

  return {
    success: true,
    data: activeTasks,
    timestamp: new Date().toISOString()
  };
}

/**
 * Returns all tasks (for search, filter, reports, completed views)
 */
function getAllTasksList() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var taskSheet = ss.getSheetByName(SHEET_NAMES.TASKS);
  var allTasks = sheetToObjects(taskSheet);
  return {
    success: true,
    data: allTasks
  };
}

/**
 * Returns employee scorecards
 */
function getEmployeeScorecardData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var scoreSheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEE_SCORECARD);
  var scorecards = sheetToObjects(scoreSheet);
  return {
    success: true,
    data: scorecards
  };
}

/**
 * Returns extension requests
 */
function getExtensionRequestsList() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var extSheet = ss.getSheetByName(SHEET_NAMES.EXTENSION_REQUESTS);
  var requests = sheetToObjects(extSheet);
  return {
    success: true,
    data: requests
  };
}

/**
 * Returns audit trail history for a task or department
 */
function getTaskHistoryList(taskId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var histSheet = ss.getSheetByName(SHEET_NAMES.TASK_HISTORY);
  var history = sheetToObjects(histSheet);
  if (taskId) {
    history = history.filter(function(h) { return h.Task_ID === taskId; });
  }
  return {
    success: true,
    data: history
  };
}

/**
 * 6. TASK CREATION
 * Atomic ID generation: AT-2026-00001
 */
function handleCreateTask(payload, authUser) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var taskSheet = ss.getSheetByName(SHEET_NAMES.TASKS);
  var now = new Date();
  var nowIso = now.toISOString();

  // Validate required fields
  if (!payload.Task_Title || !payload.Assigned_To || !payload.Deadline_Date) {
    return { success: false, error: "Task Title, Assigned Employee, and Deadline Date are required." };
  }

  // Generate next stable Task_ID: AT-YYYY-XXXXX
  var year = Utilities.formatDate(now, TIMEZONE, "yyyy");
  var lastRow = taskSheet.getLastRow();
  var nextNumber = 1;

  if (lastRow > 1) {
    var taskIds = taskSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < taskIds.length; i++) {
      var idStr = String(taskIds[i][0]);
      var match = idStr.match(/AT-\d{4}-(\d+)/);
      if (match) {
        var num = parseInt(match[1], 10);
        if (num >= nextNumber) {
          nextNumber = num + 1;
        }
      }
    }
  }

  var paddedNum = ("00000" + nextNumber).slice(-5);
  var taskId = "AT-" + year + "-" + paddedNum;

  var startDate = payload.Start_Date || Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd");
  var startTime = payload.Start_Time || Utilities.formatDate(now, TIMEZONE, "HH:mm");
  var deadlineDate = payload.Deadline_Date;
  var deadlineTime = payload.Deadline_Time || "18:00";

  var originalDeadline = deadlineDate + "T" + deadlineTime + ":00";
  var currentDeadline = originalDeadline;

  var createdBy = authUser.Employee_Name || payload.Created_By || "Accounts Admin";
  var createdByEmail = authUser.Email || payload.Created_By_Email || "accounts@manufacturing.industrial.com";

  var newTaskRecord = [
    taskId,
    nowIso,
    createdBy,
    createdByEmail,
    payload.Department || "Accounts & Finance",
    payload.Task_Title,
    payload.Task_Description || "",
    payload.Assigned_To,
    payload.Assigned_To_Email || "",
    payload.Priority || "Medium",
    payload.Task_Type || "Regular Task",
    startDate,
    startTime,
    deadlineDate,
    deadlineTime,
    payload.Is_Hourly_Task === true || payload.Task_Type === "Hourly Task",
    payload.Estimated_Duration_Hours || 0,
    "Assigned",
    typeof payload.Attachment_URLs === "string" ? payload.Attachment_URLs : JSON.stringify(payload.Attachment_URLs || []),
    "", // Completion_Notes
    "", // Completed_At
    "", // Completed_By
    originalDeadline,
    currentDeadline,
    "None", // Extension_Status
    "", // Approved_Extension_Deadline
    "", // Approved_By
    "", // Approved_At
    0,  // Points_Awarded
    "", // Points_Reason
    nowIso,
    false // Is_Archived
  ];

  taskSheet.appendRow(newTaskRecord);

  // Write audit trail
  recordTaskHistory(taskId, "Task Created", "", "Assigned to " + payload.Assigned_To, createdBy, createdByEmail, "Created new task: " + payload.Task_Title);

  // Increment assigned task count in scorecard
  incrementEmployeeScorecardStat(payload.Assigned_To, "Total_Tasks_Assigned");

  return {
    success: true,
    data: {
      Task_ID: taskId,
      Status: "Assigned",
      Current_Deadline: currentDeadline,
      Task_Title: payload.Task_Title
    },
    message: "Task created successfully with ID " + taskId
  };
}

/**
 * 6B. EXTERNAL TASK REQUEST SUBMISSION
 * Dedicated intake from external departments (Sales, Purchase, Store, etc.)
 */
function handleSubmitExternalTask(payload, authUser) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var taskSheet = ss.getSheetByName(SHEET_NAMES.TASKS);
  var now = new Date();
  var nowIso = now.toISOString();

  if (!payload.Task_Title || !payload.Requester_Name || !payload.Requested_Deadline_Date) {
    return { success: false, error: "Task Title, Requester Name, and Requested Deadline Date are required." };
  }

  // Atomic Task_ID generation
  var year = Utilities.formatDate(now, TIMEZONE, "yyyy");
  var lastRow = taskSheet.getLastRow();
  var nextNumber = 1;

  if (lastRow > 1) {
    var taskIds = taskSheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < taskIds.length; i++) {
      var idStr = String(taskIds[i][0]);
      var match = idStr.match(/AT-\d{4}-(\d+)/);
      if (match) {
        var num = parseInt(match[1], 10);
        if (num >= nextNumber) {
          nextNumber = num + 1;
        }
      }
    }
  }

  var paddedNum = ("00000" + nextNumber).slice(-5);
  var taskId = "AT-" + year + "-" + paddedNum;

  var startDate = payload.Requested_Start_Date || Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd");
  var startTime = Utilities.formatDate(now, TIMEZONE, "HH:mm");
  var deadlineDate = payload.Requested_Deadline_Date;
  var deadlineTime = payload.Requested_Deadline_Time || "18:00";
  var originalDeadline = deadlineDate + "T" + deadlineTime + ":00";

  var newTaskRecord = [
    taskId,
    nowIso,
    payload.Requester_Name,
    payload.Requester_Email || "",
    "Accounts & Finance",
    payload.Task_Title,
    payload.Task_Description || "",
    "Unassigned",
    "",
    payload.Priority_Requested || "Medium",
    "Regular Task",
    startDate,
    startTime,
    deadlineDate,
    deadlineTime,
    false,
    0,
    "Pending Assignment",
    typeof payload.Attachment_URLs === "string" ? payload.Attachment_URLs : JSON.stringify(payload.Attachment_URLs || []),
    "",
    "",
    "",
    originalDeadline,
    originalDeadline,
    "None",
    "",
    "",
    "",
    0,
    "",
    nowIso,
    false,
    "External",
    payload.Requesting_Department || "Other",
    payload.Requester_Name,
    payload.Requester_Email || "",
    payload.Requester_Contact || "",
    payload.Reference_Number || "",
    payload.Priority_Requested || "Medium",
    startDate,
    originalDeadline,
    "",
    "",
    ""
  ];

  taskSheet.appendRow(newTaskRecord);

  recordTaskHistory(
    taskId,
    "External Task Submitted",
    "",
    "Pending Assignment",
    payload.Requester_Name,
    payload.Requester_Email || "",
    "Submitted from " + (payload.Requesting_Department || "External Department") + ". Ref: " + (payload.Reference_Number || "N/A")
  );

  return {
    success: true,
    data: {
      Task_ID: taskId,
      Status: "Pending Assignment",
      Task_Title: payload.Task_Title,
      Requester_Name: payload.Requester_Name,
      Department: payload.Requesting_Department
    },
    message: "Task " + taskId + " submitted successfully. Awaiting Accounts Manager assignment."
  };
}

/**
 * 6C. ASSIGN TASK TO ACCOUNTS EMPLOYEE
 */
function handleAssignTask(payload, authUser) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var taskSheet = ss.getSheetByName(SHEET_NAMES.TASKS);
  var taskId = payload.Task_ID;

  if (!taskId || !payload.Assigned_To) {
    return { success: false, error: "Task_ID and Assigned_To are required." };
  }

  var rowIdx = findRowIndexByTaskId(taskSheet, taskId);
  if (rowIdx === -1) {
    return { success: false, error: "Task not found: " + taskId };
  }

  var now = new Date();
  var nowIso = now.toISOString();

  var prevAssignee = taskSheet.getRange(rowIdx, 8).getValue();
  taskSheet.getRange(rowIdx, 8).setValue(payload.Assigned_To);
  if (payload.Assigned_To_Email) taskSheet.getRange(rowIdx, 9).setValue(payload.Assigned_To_Email);
  if (payload.Priority) taskSheet.getRange(rowIdx, 10).setValue(payload.Priority);
  if (payload.Task_Type) taskSheet.getRange(rowIdx, 11).setValue(payload.Task_Type);
  if (payload.Start_Date) taskSheet.getRange(rowIdx, 12).setValue(payload.Start_Date);
  if (payload.Start_Time) taskSheet.getRange(rowIdx, 13).setValue(payload.Start_Time);
  if (payload.Deadline_Date) taskSheet.getRange(rowIdx, 14).setValue(payload.Deadline_Date);
  if (payload.Deadline_Time) taskSheet.getRange(rowIdx, 15).setValue(payload.Deadline_Time);
  if (typeof payload.Is_Hourly_Task === "boolean") taskSheet.getRange(rowIdx, 16).setValue(payload.Is_Hourly_Task);
  if (payload.Estimated_Duration_Hours !== undefined) taskSheet.getRange(rowIdx, 17).setValue(payload.Estimated_Duration_Hours);
  
  taskSheet.getRange(rowIdx, 18).setValue("Assigned");

  var dDate = payload.Deadline_Date || taskSheet.getRange(rowIdx, 14).getValue();
  var dTime = payload.Deadline_Time || taskSheet.getRange(rowIdx, 15).getValue() || "18:00";
  taskSheet.getRange(rowIdx, 24).setValue(dDate + "T" + dTime + ":00");

  taskSheet.getRange(rowIdx, 31).setValue(nowIso);

  var assignedBy = authUser.Employee_Name || "Accounts Manager";
  taskSheet.getRange(rowIdx, 42).setValue(assignedBy);
  taskSheet.getRange(rowIdx, 43).setValue(nowIso);
  taskSheet.getRange(rowIdx, 44).setValue(payload.Assignment_Notes || "");

  // Audit history
  recordTaskHistory(
    taskId,
    "Task Assigned",
    prevAssignee || "Unassigned",
    "Assigned to " + payload.Assigned_To,
    assignedBy,
    authUser.Email || "",
    payload.Assignment_Notes || "Assigned by Accounts Manager"
  );

  // Increment assigned stat in scorecard
  incrementEmployeeScorecardStat(payload.Assigned_To, "Total_Tasks_Assigned");

  return {
    success: true,
    message: "Task " + taskId + " successfully assigned to " + payload.Assigned_To
  };
}

/**
 * CANCEL TASK
 */
function handleCancelTask(payload, authUser) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var taskSheet = ss.getSheetByName(SHEET_NAMES.TASKS);
  var taskId = payload.Task_ID;

  if (!taskId) return { success: false, error: "Task_ID is required." };
  var rowIdx = findRowIndexByTaskId(taskSheet, taskId);
  if (rowIdx === -1) return { success: false, error: "Task not found." };

  var oldStatus = taskSheet.getRange(rowIdx, 18).getValue();
  taskSheet.getRange(rowIdx, 18).setValue("Cancelled");
  taskSheet.getRange(rowIdx, 20).setValue("Cancelled: " + (payload.Reason || ""));
  taskSheet.getRange(rowIdx, 31).setValue(new Date().toISOString());

  recordTaskHistory(
    taskId,
    "Task Cancelled",
    oldStatus,
    "Cancelled",
    authUser.Employee_Name || "Accounts Desk",
    authUser.Email || "",
    payload.Reason || "Cancelled by Accounts Desk"
  );

  return { success: true, message: "Task " + taskId + " cancelled." };
}

/**
 * 8. TASK STATUS WORKFLOW
 */
function handleUpdateTaskStatus(payload, authUser) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var taskSheet = ss.getSheetByName(SHEET_NAMES.TASKS);
  var taskId = payload.Task_ID;
  var newStatus = payload.Status;

  if (!taskId || !newStatus) {
    return { success: false, error: "Task_ID and Status are required" };
  }

  var rowIdx = findRowIndexByTaskId(taskSheet, taskId);
  if (rowIdx === -1) {
    return { success: false, error: "Task not found: " + taskId };
  }

  var currentStatus = taskSheet.getRange(rowIdx, 18).getValue(); // Col 18 = Status
  if (currentStatus === "Completed") {
    return { success: false, error: "Completed task cannot have status modified. Reopen is restricted." };
  }

  var nowIso = new Date().toISOString();
  taskSheet.getRange(rowIdx, 18).setValue(newStatus);
  taskSheet.getRange(rowIdx, 31).setValue(nowIso); // Col 31 = Updated_At

  recordTaskHistory(
    taskId,
    "Status Changed",
    currentStatus,
    newStatus,
    authUser.Employee_Name || "Employee",
    authUser.Email || "",
    payload.Remarks || "Status changed to " + newStatus
  );

  return {
    success: true,
    data: { Task_ID: taskId, Status: newStatus, Previous_Status: currentStatus },
    message: "Status updated to " + newStatus
  };
}

/**
 * 9. DEADLINE EXTENSION REQUEST
 */
function handleRequestTaskExtension(payload, authUser) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var taskSheet = ss.getSheetByName(SHEET_NAMES.TASKS);
  var extSheet = ss.getSheetByName(SHEET_NAMES.EXTENSION_REQUESTS);
  var taskId = payload.Task_ID;
  var reason = payload.Reason;
  var requestedDeadline = payload.Requested_Deadline;

  if (!taskId || !reason || !requestedDeadline) {
    return { success: false, error: "Task_ID, Reason, and Requested_Deadline are mandatory." };
  }

  var rowIdx = findRowIndexByTaskId(taskSheet, taskId);
  if (rowIdx === -1) {
    return { success: false, error: "Task not found: " + taskId };
  }

  var currentDeadline = taskSheet.getRange(rowIdx, 24).getValue(); // Current_Deadline
  var taskTitle = taskSheet.getRange(rowIdx, 6).getValue();
  var now = new Date();
  var nowIso = now.toISOString();

  // Create extension request record
  var requestId = "EXT-" + ("00000" + (extSheet.getLastRow())).slice(-5);
  var requesterName = authUser.Employee_Name || payload.Requested_By || "Employee";

  extSheet.appendRow([
    requestId,
    taskId,
    requesterName,
    nowIso,
    currentDeadline,
    requestedDeadline,
    reason,
    "Pending",
    "", "", "" // Reviewed_By, Reviewed_At, Review_Comments
  ]);

  // Update task extension status to Requested
  taskSheet.getRange(rowIdx, 18).setValue("Extension Requested"); // Status
  taskSheet.getRange(rowIdx, 25).setValue("Requested"); // Extension_Status
  taskSheet.getRange(rowIdx, 31).setValue(nowIso);

  recordTaskHistory(
    taskId,
    "Extension Requested",
    "Current Deadline: " + currentDeadline,
    "Requested: " + requestedDeadline,
    requesterName,
    authUser.Email || "",
    "Reason: " + reason
  );

  return {
    success: true,
    data: {
      Request_ID: requestId,
      Task_ID: taskId,
      Status: "Pending",
      Requested_Deadline: requestedDeadline
    },
    message: "Extension request submitted for review."
  };
}

/**
 * 9. REVIEW EXTENSION (Admin / Manager only)
 */
function handleReviewTaskExtension(payload, authUser) {
  // Check authorization
  var userRole = authUser.Role;
  if (userRole !== "Administrator" && userRole !== "Manager") {
    return { success: false, error: "Permission Denied: Only Administrator or Manager can review deadline extensions." };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var extSheet = ss.getSheetByName(SHEET_NAMES.EXTENSION_REQUESTS);
  var taskSheet = ss.getSheetByName(SHEET_NAMES.TASKS);

  var requestId = payload.Request_ID;
  var taskId = payload.Task_ID;
  var decision = payload.Decision; // 'Approved' | 'Rejected'
  var comments = payload.Review_Comments || "";
  var approvedDeadline = payload.Approved_Deadline;

  var extRowIdx = -1;
  var extLastRow = extSheet.getLastRow();
  if (extLastRow > 1) {
    var extIds = extSheet.getRange(2, 1, extLastRow - 1, 1).getValues();
    for (var i = 0; i < extIds.length; i++) {
      if (extIds[i][0] === requestId) {
        extRowIdx = i + 2;
        break;
      }
    }
  }

  if (extRowIdx === -1) {
    return { success: false, error: "Extension request not found: " + requestId };
  }

  var nowIso = new Date().toISOString();
  var reviewerName = authUser.Employee_Name || "Manager";

  // Update extension record
  extSheet.getRange(extRowIdx, 8).setValue(decision); // Status
  extSheet.getRange(extRowIdx, 9).setValue(reviewerName); // Reviewed_By
  extSheet.getRange(extRowIdx, 10).setValue(nowIso); // Reviewed_At
  extSheet.getRange(extRowIdx, 11).setValue(comments); // Review_Comments

  // Update Task record
  var taskRowIdx = findRowIndexByTaskId(taskSheet, taskId);
  if (taskRowIdx !== -1) {
    if (decision === "Approved") {
      var finalApprovedDeadline = approvedDeadline || extSheet.getRange(extRowIdx, 6).getValue();
      taskSheet.getRange(taskRowIdx, 18).setValue("In Progress"); // Status back to In Progress
      taskSheet.getRange(taskRowIdx, 24).setValue(finalApprovedDeadline); // Col 24 = Current_Deadline
      taskSheet.getRange(taskRowIdx, 25).setValue("Approved"); // Col 25 = Extension_Status
      taskSheet.getRange(taskRowIdx, 26).setValue(finalApprovedDeadline); // Col 26 = Approved_Extension_Deadline
      taskSheet.getRange(taskRowIdx, 27).setValue(reviewerName); // Approved_By
      taskSheet.getRange(taskRowIdx, 28).setValue(nowIso); // Approved_At
      taskSheet.getRange(taskRowIdx, 31).setValue(nowIso);

      recordTaskHistory(
        taskId,
        "Extension Approved",
        "Requested",
        "Approved: " + finalApprovedDeadline,
        reviewerName,
        authUser.Email || "",
        comments
      );
    } else {
      taskSheet.getRange(taskRowIdx, 18).setValue("In Progress");
      taskSheet.getRange(taskRowIdx, 25).setValue("Rejected");
      taskSheet.getRange(taskRowIdx, 31).setValue(nowIso);

      recordTaskHistory(
        taskId,
        "Extension Rejected",
        "Requested",
        "Rejected by " + reviewerName,
        reviewerName,
        authUser.Email || "",
        comments
      );
    }
  }

  return {
    success: true,
    data: {
      Request_ID: requestId,
      Task_ID: taskId,
      Decision: decision,
      Reviewed_By: reviewerName
    },
    message: "Extension request " + decision.toLowerCase() + " successfully."
  };
}

/**
 * 10. TASK COMPLETION & POINTS SCORING
 * Calculates points on the server based on server timestamp.
 * Immediately excludes task from active board queries.
 */
function handleCompleteTask(payload, authUser) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var taskSheet = ss.getSheetByName(SHEET_NAMES.TASKS);
  var taskId = payload.Task_ID;
  var completionNotes = payload.Completion_Notes || "";

  if (!taskId) {
    return { success: false, error: "Task_ID is required." };
  }

  var rowIdx = findRowIndexByTaskId(taskSheet, taskId);
  if (rowIdx === -1) {
    return { success: false, error: "Task not found: " + taskId };
  }

  // Prevent duplicate completion
  var currentStatus = taskSheet.getRange(rowIdx, 18).getValue();
  if (currentStatus === "Completed") {
    return { success: false, error: "Task is already completed. Duplicate scoring prevented." };
  }

  var now = new Date();
  var completedAtIso = now.toISOString();
  var completedBy = authUser.Employee_Name || payload.Completed_By || "Employee";
  var assignedTo = taskSheet.getRange(rowIdx, 8).getValue();
  var originalDeadlineStr = taskSheet.getRange(rowIdx, 23).getValue();
  var currentDeadlineStr = taskSheet.getRange(rowIdx, 24).getValue();
  var extensionStatus = taskSheet.getRange(rowIdx, 25).getValue();
  var approvedDeadlineStr = taskSheet.getRange(rowIdx, 26).getValue();

  // Evaluate applicable deadline
  var effectiveDeadlineStr = currentDeadlineStr;
  var hadApprovedExtension = (extensionStatus === "Approved" && approvedDeadlineStr);
  if (hadApprovedExtension) {
    effectiveDeadlineStr = approvedDeadlineStr;
  }

  var effectiveDeadline = new Date(effectiveDeadlineStr);
  var pointsAwarded = 0;
  var pointsReason = "";
  var isOnTime = false;

  // Compare server-side timestamps (with 1-min network transit buffer)
  var diffMs = effectiveDeadline.getTime() - now.getTime();
  if (diffMs >= -60000) {
    // Completed on or before applicable deadline
    pointsAwarded = 5;
    isOnTime = true;
    if (hadApprovedExtension) {
      pointsReason = "Completed on or before approved extended deadline (+5 pts)";
    } else {
      pointsReason = "Completed on or before original deadline (+5 pts)";
    }
  } else {
    // Late completion
    pointsAwarded = 0;
    isOnTime = false;
    if (hadApprovedExtension) {
      pointsReason = "Completed after approved extended deadline (0 pts)";
    } else if (extensionStatus === "Requested") {
      pointsReason = "Completed after deadline while extension request was pending (0 pts)";
    } else {
      pointsReason = "Completed after original deadline (0 pts)";
    }
  }

  // Update Task record
  taskSheet.getRange(rowIdx, 18).setValue("Completed"); // Status
  taskSheet.getRange(rowIdx, 20).setValue(completionNotes); // Completion_Notes
  taskSheet.getRange(rowIdx, 21).setValue(completedAtIso); // Completed_At
  taskSheet.getRange(rowIdx, 22).setValue(completedBy); // Completed_By
  taskSheet.getRange(rowIdx, 29).setValue(pointsAwarded); // Points_Awarded
  taskSheet.getRange(rowIdx, 30).setValue(pointsReason); // Points_Reason
  taskSheet.getRange(rowIdx, 31).setValue(completedAtIso); // Updated_At

  // Record audit trail
  recordTaskHistory(
    taskId,
    "Task Completed",
    currentStatus,
    "Completed (" + pointsAwarded + " points awarded)",
    completedBy,
    authUser.Email || "",
    pointsReason + ". Notes: " + completionNotes
  );

  // Update Employee Scorecard
  updateEmployeeScorecardOnCompletion(assignedTo, isOnTime, hadApprovedExtension, pointsAwarded);

  return {
    success: true,
    data: {
      Task_ID: taskId,
      Status: "Completed",
      Completed_At: completedAtIso,
      Completed_By: completedBy,
      Points_Awarded: pointsAwarded,
      Points_Reason: pointsReason,
      Is_On_Time: isOnTime
    },
    message: "Task successfully completed. Awarded " + pointsAwarded + " points."
  };
}

/**
 * Handles base64 file upload to Google Drive
 */
function handleUploadAttachment(payload, authUser) {
  var fileName = payload.name || "Attachment_" + new Date().getTime();
  var mimeType = payload.type || "application/octet-stream";
  var base64Data = payload.base64;

  if (!base64Data) {
    return { success: false, error: "No file data provided." };
  }

  try {
    var folder;
    var folders = DriveApp.getFoldersByName(FOLDER_NAME);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(FOLDER_NAME);
    }

    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);
    var file = folder.createFile(blob);

    return {
      success: true,
      data: {
        name: fileName,
        url: file.getUrl(),
        driveFileId: file.getId(),
        size: file.getSize()
      }
    };
  } catch (e) {
    return { success: false, error: "Failed to upload file to Drive: " + e.toString() };
  }
}

// ============================================================================
// SCORECARD & AUDIT HELPERS
// ============================================================================

/**
 * Writes a row to TASK_HISTORY
 */
function recordTaskHistory(taskId, action, oldValue, newValue, performedBy, performedByEmail, remarks) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var histSheet = ss.getSheetByName(SHEET_NAMES.TASK_HISTORY);
    var historyId = "HIST-" + ("00000" + histSheet.getLastRow()).slice(-5);
    histSheet.appendRow([
      historyId,
      taskId,
      action,
      String(oldValue || ""),
      String(newValue || ""),
      performedBy,
      performedByEmail,
      new Date().toISOString(),
      remarks || ""
    ]);
  } catch (e) {
    Logger.log("Failed to record history: " + e);
  }
}

/**
 * Increments an employee scorecard numeric stat
 */
function incrementEmployeeScorecardStat(employeeName, statColumnName) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var scoreSheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEE_SCORECARD);
    var data = scoreSheet.getDataRange().getValues();
    if (data.length <= 1) return;

    var headers = data[0];
    var colIdx = headers.indexOf(statColumnName);
    if (colIdx === -1) return;

    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === employeeName) {
        var currentVal = parseInt(data[i][colIdx], 10) || 0;
        scoreSheet.getRange(i + 1, colIdx + 1).setValue(currentVal + 1);
        scoreSheet.getRange(i + 1, 9).setValue(new Date().toISOString()); // Col 9 = Updated_At
        break;
      }
    }
  } catch (e) {
    Logger.log("Failed to increment scorecard stat: " + e);
  }
}

/**
 * Updates scorecard upon task completion
 */
function updateEmployeeScorecardOnCompletion(employeeName, isOnTime, hadApprovedExtension, points) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var scoreSheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEE_SCORECARD);
    var data = scoreSheet.getDataRange().getValues();
    if (data.length <= 1) return;

    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === employeeName) {
        var row = i + 1;
        var totalCompleted = (parseInt(data[i][3], 10) || 0) + 1;
        var onTime = parseInt(data[i][4], 10) || 0;
        var late = parseInt(data[i][5], 10) || 0;
        var extDone = parseInt(data[i][6], 10) || 0;
        var currentPoints = parseInt(data[i][7], 10) || 0;

        if (isOnTime) {
          onTime += 1;
        } else {
          late += 1;
        }

        if (hadApprovedExtension && isOnTime) {
          extDone += 1;
        }

        currentPoints += points;

        scoreSheet.getRange(row, 4).setValue(totalCompleted); // Total_Tasks_Completed
        scoreSheet.getRange(row, 5).setValue(onTime);          // On_Time_Completions
        scoreSheet.getRange(row, 6).setValue(late);            // Late_Completions
        scoreSheet.getRange(row, 7).setValue(extDone);         // Approved_Extension_Completions
        scoreSheet.getRange(row, 8).setValue(currentPoints);   // Total_Points
        scoreSheet.getRange(row, 9).setValue(new Date().toISOString());
        break;
      }
    }
  } catch (e) {
    Logger.log("Failed to update employee scorecard: " + e);
  }
}

/**
 * Recalculates all scorecards from TASKS sheet
 */
function recalculateAllScorecards() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var taskSheet = ss.getSheetByName(SHEET_NAMES.TASKS);
  var scoreSheet = ss.getSheetByName(SHEET_NAMES.EMPLOYEE_SCORECARD);
  var tasks = sheetToObjects(taskSheet);
  var scorecards = sheetToObjects(scoreSheet);

  var stats = {};
  for (var i = 0; i < scorecards.length; i++) {
    var name = scorecards[i].Employee_Name;
    stats[name] = {
      assigned: 0,
      completed: 0,
      onTime: 0,
      late: 0,
      extCompleted: 0,
      points: 0
    };
  }

  for (var t = 0; t < tasks.length; t++) {
    var task = tasks[t];
    var emp = task.Assigned_To;
    if (!stats[emp]) {
      stats[emp] = { assigned: 0, completed: 0, onTime: 0, late: 0, extCompleted: 0, points: 0 };
    }
    stats[emp].assigned += 1;

    if (task.Status === "Completed") {
      stats[emp].completed += 1;
      var pts = parseInt(task.Points_Awarded, 10) || 0;
      stats[emp].points += pts;
      if (pts > 0) {
        stats[emp].onTime += 1;
        if (task.Extension_Status === "Approved") {
          stats[emp].extCompleted += 1;
        }
      } else {
        stats[emp].late += 1;
      }
    }
  }

  // Write back to sheet
  for (var s = 0; s < scorecards.length; s++) {
    var empName = scorecards[s].Employee_Name;
    var rowIdx = s + 2;
    var st = stats[empName];
    if (st) {
      scoreSheet.getRange(rowIdx, 3).setValue(st.assigned);
      scoreSheet.getRange(rowIdx, 4).setValue(st.completed);
      scoreSheet.getRange(rowIdx, 5).setValue(st.onTime);
      scoreSheet.getRange(rowIdx, 6).setValue(st.late);
      scoreSheet.getRange(rowIdx, 7).setValue(st.extCompleted);
      scoreSheet.getRange(rowIdx, 8).setValue(st.points);
      scoreSheet.getRange(rowIdx, 9).setValue(new Date().toISOString());
    }
  }

  SpreadsheetApp.getUi().alert("Scorecards Recalculated Successfully");
}

/**
 * Finds 1-based row index for a given Task_ID in TASKS sheet
 */
function findRowIndexByTaskId(sheet, taskId) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(taskId).trim()) {
      return i + 2;
    }
  }
  return -1;
}

/**
 * Utility: Converts sheet data to an array of JavaScript objects based on Row 1 headers
 */
function sheetToObjects(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var objects = [];

  for (var r = 0; r < rows.length; r++) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var header = headers[c];
      var cellVal = rows[r][c];
      if (cellVal instanceof Date) {
        cellVal = cellVal.toISOString();
      }
      obj[header] = cellVal;
    }
    objects.push(obj);
  }
  return objects;
}
