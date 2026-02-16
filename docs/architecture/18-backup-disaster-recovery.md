# Backup & Disaster Recovery Automation

```mermaid
flowchart TD
    subgraph "Automated Backup Schedule"
        CRON["⏰ Cron Job<br/>Daily at 02:00 UTC"]
    end

    subgraph "Database Backup"
        DB1["docker exec sichrplace-mssql<br/>sqlcmd BACKUP DATABASE"]
        DB2["Compress .bak file<br/>gzip → ~60% smaller"]
        DB3["Rotate: Keep 7 daily<br/>4 weekly, 12 monthly"]
    end

    subgraph "File Storage Backup"
        FS1["docker exec sichrplace-minio<br/>mc mirror → backup location"]
        FS2["Sync apartments/ videos/ profiles/<br/>buckets to backup volume"]
    end

    subgraph "Config Backup"
        CF1["Backup .env"]
        CF2["Backup nginx.conf"]
        CF3["Backup docker-compose.selfhosted.yml"]
        CF4["git bundle → full repo snapshot"]
    end

    subgraph "Disaster Recovery"
        DR1{"What failed?"}
        DR2["Single container crash<br/>→ Docker auto-restarts"]
        DR3["Database corruption<br/>→ Restore from .bak"]
        DR4["Full server loss<br/>→ New server + restore"]
    end

    CRON --> DB1 --> DB2 --> DB3
    CRON --> FS1 --> FS2
    CRON --> CF1 & CF2 & CF3 & CF4

    DR1 -->|Container| DR2
    DR1 -->|Database| DR3
    DR1 -->|Server| DR4

    style CRON fill:#FF9800,color:white
    style DR2 fill:#4CAF50,color:white
    style DR3 fill:#FF9800,color:white
    style DR4 fill:#c62828,color:white
```

## Recovery Time Estimates

```mermaid
graph LR
    subgraph "Scenario → Recovery"
        A["Container crash<br/>⏱️ ~30 seconds<br/>Docker auto-restart"]
        B["Spring Boot bug<br/>⏱️ ~3 minutes<br/>git revert + push"]
        C["Database corruption<br/>⏱️ ~15 minutes<br/>Restore .bak backup"]
        D["Full server loss<br/>⏱️ ~45 minutes<br/>New server + docker compose up"]
    end

    style A fill:#4CAF50,color:white
    style B fill:#8BC34A,color:white
    style C fill:#FF9800,color:white
    style D fill:#f44336,color:white
```

## Backup Script (Automated)

```bash
#!/bin/bash
# backup-sichrplace.sh — Run via cron: 0 2 * * *

DATE=$(date +%Y%m%d_%H%M)
BACKUP_DIR=/backups/sichrplace/$DATE
mkdir -p $BACKUP_DIR

# 1. Database
docker exec sichrplace-mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$DB_PASSWORD" -C \
  -Q "BACKUP DATABASE SichrPlaceDB TO DISK='/var/opt/mssql/backup_$DATE.bak'"
docker cp sichrplace-mssql:/var/opt/mssql/backup_$DATE.bak $BACKUP_DIR/
gzip $BACKUP_DIR/backup_$DATE.bak

# 2. MinIO files
docker exec sichrplace-minio mc mirror /data $BACKUP_DIR/minio/

# 3. Config
cp .env docker-compose.selfhosted.yml $BACKUP_DIR/

# 4. Rotate (keep 7 days)
find /backups/sichrplace -maxdepth 1 -mtime +7 -exec rm -rf {} \;

echo "✅ Backup complete: $BACKUP_DIR"
```
