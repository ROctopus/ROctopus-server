var codes = {
  "error": {
    "1": {
      "type": "jobrequest",
      "msg": "No jobs available",
      "description": "All jobs are running or done",
      "action": "nothing"
    },
    "2": {
      "type": "jobrequest",
      "msg": "Failed to count available jobs",
      "description": "Database failed to assess whether jobs are available",
      "action": "retry"
    },
    "3": {
      "type": "jobrequest",
      "msg": "No job found",
      "description": "Database failed to return the first available job",
      "action": "retry"
    },
    "4": {
      "type": "jobrequest",
      "msg": "Job failed to lock",
      "description": "Database failed to lock the job for you",
      "action": "retry"
    },
    "5": {
      "type": "filesave",
      "msg": "User not found",
      "description": "Server could not find the user associated with job ID",
      "action": "retry"
    },
    "6": {
      "type": "filesave",
      "msg": "File save failed",
      "description": "Server could not save the file in the suggested location",
      "action": "retry"
    }
  },
  "message": {
    "0": {
      "type": "connection",
      "msg": "Client connected",
      "description": "Server has assigned a socket to the client",
      "action": "continue"
    },
    "1": {
      "type": "filesave",
      "msg": "File successfully saved",
      "description": "The file was stored in the user's directory",
      "action": "continue"
    }
  }
};