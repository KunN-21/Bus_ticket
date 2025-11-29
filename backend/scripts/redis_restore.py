"""
Redis Restore Script
Phục hồi dữ liệu từ file backup JSON về Redis Cloud
"""
import redis
import json
import sys
import os

# Redis Cloud connection
REDIS_HOST = "redis-10134.crce185.ap-seast-1-1.ec2.redns.redis-cloud.com"
REDIS_PORT = 10134
REDIS_PASSWORD = "dEfaFN1CYPJZckm6chYY4K2Fq1V5Ph2o"


def restore_redis(backup_file):
    """Restore Redis data từ file backup"""
    
    # Kết nối Redis
    r = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD,
        decode_responses=True
    )
    
    # Test connection
    try:
        r.ping()
        print(" Connected to Redis Cloud")
    except Exception as e:
        print(f" Connection failed: {e}")
        return
    
    # Load backup file
    if not os.path.exists(backup_file):
        print(f" File không tồn tại: {backup_file}")
        return
    
    with open(backup_file, 'r', encoding='utf-8') as f:
        backup_data = json.load(f)
    
    print(f" Restoring from: {backup_file}")
    print(f" Backup time: {backup_data.get('timestamp', 'N/A')}")
    print(f" Keys to restore: {len(backup_data['keys'])}")
    print("-" * 50)
    
    success_count = 0
    error_count = 0
    
    for key, data in backup_data['keys'].items():
        key_type = data['type']
        value = data['value']
        ttl = data.get('ttl', -1)
        
        try:
            if key_type == 'string':
                if isinstance(value, dict):
                    r.set(key, json.dumps(value))
                else:
                    r.set(key, value)
                    
            elif key_type == 'hash':
                r.delete(key)
                if value:
                    r.hset(key, mapping=value)
                
            elif key_type == 'list':
                r.delete(key)
                if value:
                    r.rpush(key, *value)
                    
            elif key_type == 'set':
                r.delete(key)
                if value:
                    r.sadd(key, *value)
                    
            elif key_type == 'zset':
                r.delete(key)
                for item in value:
                    r.zadd(key, {item['member']: item['score']})
            
            # Set TTL if exists
            if ttl > 0:
                r.expire(key, ttl)
                
            print(f"  ✓ {key} ({key_type})")
            success_count += 1
            
        except Exception as e:
            print(f"  ✗ {key}: {e}")
            error_count += 1
    
    print("-" * 50)
    print(f" Restore completed!")
    print(f"   Success: {success_count}")
    print(f"   Errors: {error_count}")


def list_backups():
    """Liệt kê các file backup có sẵn"""
    script_dir = os.path.dirname(__file__)
    backups = [f for f in os.listdir(script_dir) if f.startswith('redis_backup_') and f.endswith('.json')]
    
    if not backups:
        print(" Không tìm thấy file backup nào")
        return
    
    print(" Các file backup có sẵn:")
    for i, backup in enumerate(sorted(backups, reverse=True), 1):
        filepath = os.path.join(script_dir, backup)
        size = os.path.getsize(filepath)
        print(f"  {i}. {backup} ({size:,} bytes)")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(" Redis Restore Tool")
        print("-" * 30)
        print("Usage:")
        print("  python redis_restore.py <backup_file.json>")
        print("  python redis_restore.py --list")
        print()
        list_backups()
    elif sys.argv[1] == "--list":
        list_backups()
    else:
        restore_redis(sys.argv[1])
