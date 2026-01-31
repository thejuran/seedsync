# Usage

This guide covers the main features and workflows in SeedSync.

---

## Getting Started

After installation, access SeedSync at [http://localhost:8800](http://localhost:8800) (or your configured port).

### Initial Setup

1. Navigate to **Settings** from the sidebar
2. Configure your remote server connection:
    - **Server Address**: Your seedbox hostname or IP
    - **Server User**: SSH username
    - **Server Password**: SSH password (or use key-based auth)
    - **Server Directory**: Path to sync from (e.g., `/home/user/downloads`)
    - **Local Directory**: Path to sync to (e.g., `/downloads` for Docker)
3. Click **Save** and restart SeedSync

!!! tip "Use Key-Based Authentication"
    Password-based SSH is less secure. See the [Installation Guide](install.md#key-auth) for setting up SSH keys.

---

## Dashboard

The Dashboard is your main control center. It displays a unified view of files from both your remote server and local machine.

### File List

Files are shown with their current status:

| Status | Description |
|--------|-------------|
| **Default** | File exists on remote server, not yet synced |
| **Queued** | File is queued for download |
| **Downloading** | Transfer in progress (shows percentage) |
| **Downloaded** | File has been synced to local machine |
| **Extracting** | Archive is being extracted |
| **Extracted** | Archive has been extracted |

### File Actions

Click on any file to see available actions:

- **Queue** - Add file to download queue
- **Stop** - Cancel an active download
- **Extract** - Extract archive contents (zip, rar, 7z, etc.)
- **Delete Local** - Remove the local copy
- **Delete Remote** - Remove the remote copy

!!! warning "Delete Operations"
    Delete operations are permanent and cannot be undone.

### Filtering and Sorting

- Use the search box to filter files by name
- Files are sorted by status and name by default

---

## AutoQueue

AutoQueue automatically downloads new files from your remote server without manual intervention.

### Basic Mode

When enabled without patterns, AutoQueue downloads **all** new files that appear on the remote server.

### Pattern-Based Mode

For more control, enable pattern matching in Settings:

1. Go to **Settings** > Enable "Restrict AutoQueue to patterns"
2. Go to **AutoQueue** page
3. Add patterns to match files you want

#### Pattern Examples

| Pattern | Matches |
|---------|---------|
| `Ubuntu*` | Files starting with "Ubuntu" |
| `*.iso` | All ISO files |
| `*1080p*` | Files containing "1080p" |
| `TV.Show.S01*` | Season 1 of a TV show |

Patterns use glob-style matching (wildcards `*` and `?`).

---

## Settings

Configure SeedSync behavior through the Settings page.

![Settings Page](images/install_2.png)

### Connection Settings

| Setting | Description |
|---------|-------------|
| Server Address | Hostname or IP of your remote server |
| Server Port | SSH port (default: 22) |
| Server User | SSH username |
| Server Password | SSH password |
| Use Key-Based Auth | Enable passwordless SSH (recommended) |
| Server Directory | Remote path to sync from |
| Local Directory | Local path to sync to |

### Transfer Settings

| Setting | Description |
|---------|-------------|
| Max Parallel Downloads | Number of simultaneous file transfers |
| LFTP Options | Advanced LFTP configuration |

### AutoQueue Settings

| Setting | Description |
|---------|-------------|
| Enable AutoQueue | Automatically queue new remote files |
| Restrict to Patterns | Only queue files matching patterns |

### Extract Settings

| Setting | Description |
|---------|-------------|
| Enable Auto-Extract | Automatically extract archives after download |
| Delete Archive After Extract | Remove archive file after successful extraction |

---

## Logs and Debugging

### Viewing Logs

**Docker:**
```bash
docker logs seedsync
```

**Deb Package:**
```bash
cat ~/.seedsync/log/seedsync.log
```

### Common Issues

See the [FAQ](faq.md) for troubleshooting common problems.

---

## API Access

SeedSync provides a REST API for programmatic control. The API is available at the same address as the web UI.

### Example: Get File List

```bash
curl http://localhost:8800/server/files
```

### Example: Queue a File

```bash
curl -X POST http://localhost:8800/server/files/filename/queue
```

