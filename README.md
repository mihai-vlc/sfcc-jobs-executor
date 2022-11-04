# SFCC Jobs Executor

Run SFCC jobs from VSCode.

![screenshot](/screenshots/screen1.png)

## Features

- Read the job id from the comments on the active file
- Show the job execution logs in the output window

## Installation

You can install it from the [marketplace](https://marketplace.visualstudio.com/items?itemName=ionutvmi.sfcc-jobs-executor).  
`ext install ionutvmi.sfcc-jobs-executor`

## Configuration

### Business Manager

Administration > Site Development > Open Commerce API Settings  
Data - Global

```json
{
  "clients": [
    {
      "allowed_origins": [],
      "client_id": "",
      "resources": [
        {
          "resource_id": "/jobs/{job_id}/executions",
          "read_attributes": "(**)",
          "write_attributes": "(**)",
          "methods": ["post"]
        },
        {
          "resource_id": "/jobs/{job_id}/executions/{id}",
          "read_attributes": "(**)",
          "write_attributes": "(**)",
          "methods": ["get"]
        }
      ]
    }
  ]
}
```

Administration > Organization > WebDAV Client Permissions

```jsonc
{
  "clients": [
    {
      "client_id": "",
      "permissions": [
        {
          "path": "/Logs",
          "operations": ["read"]
        }
      ]
    }
  ]
}
```

### In the VSCode workspace

```jsonc
// dw.json file
{
  "hostname": "",
  "client-id": "",
  "client-secret": ""
}
```

```js
// In any file you can specify the job id and timeout
//   The job id should be last in the configuration list.

// @sfccJobTailLogTimeout 60000
// @sfccJobClearLog
// @sfccJobId 000-test-job

// or jsdoc style

/**
 * @sfccJobTailLogTimeout 60000
 * @sfccJobClearLog
 * @sfccJobId 000-test-job
 */
```

## Keyboard shortcuts

To configure a custom keyboard shortcut:

```jsonc
// keybindings.json
{
  "key": "ctrl+shift+f6",
  "command": "sfcc-jobs-executor.runJob"
}
```

## Release Notes

The release notes are available in the [CHANGELOG.md](./CHANGELOG.md) document.

---

## Author

Mihai Ionut Vilcu

- [github/ionutvmi](https://github.com/ionutvmi)
- [twitter/mihai_vlc](http://twitter.com/mihai_vlc)

**Enjoy!**
