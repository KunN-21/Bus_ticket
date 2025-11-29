"""
Redis Backup Script
Backup toàn bộ dữ liệu từ Redis Cloud về file JSON
"""
import redis
import json
import base64
from datetime import datetime
import os

# Redis Cloud connection
REDIS_HOST = "redis-10134.crce185.ap-seast-1-1.ec2.redns.redis-cloud.com"
REDIS_PORT = 10134
REDIS_PASSWORD = "dEfaFN1CYPJZckm6chYY4K2Fq1V5Ph2o"

def backup_redis():
    """Backup toàn bộ Redis data về file JSON"""
    
    # Kết nối Redis
    r = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        password=REDIS_PASSWORD,
        decode_responses=False  # Giữ bytes để encode base64
    )
    
    # Test connection
    try:
        r.ping()
        print(" Connected to Redis Cloud")
    except Exception as e:
        print(f" Connection failed: {e}")
        return
    
    backup_data = {
        "timestamp": datetime.now().isoformat(),
        "host": REDIS_HOST,
        "keys": {}
    }
    
    # Scan tất cả keys
    print(" Scanning all keys...")
    cursor = 0
    all_keys = []
    
    while True:
        cursor, keys = r.scan(cursor=cursor, count=100)
        all_keys.extend(keys)
        if cursor == 0:
            break
    
    print(f" Found {len(all_keys)} keys")
    
    # Backup từng key
    for key in all_keys:
        key_str = key.decode('utf-8') if isinstance(key, bytes) else key
        key_type = r.type(key).decode('utf-8')
        ttl = r.ttl(key)
        
        try:
            if key_type == 'string':
                value = r.get(key)
                if value:
                    try:
                        # Try decode as JSON
                        value = json.loads(value.decode('utf-8'))
                    except:
                        # Store as base64 if not JSON
                        value = base64.b64encode(value).decode('utf-8')
                        
            elif key_type == 'hash':
                value = {
                    k.decode('utf-8'): v.decode('utf-8') 
                    for k, v in r.hgetall(key).items()
                }
                
            elif key_type == 'list':
                value = [
                    item.decode('utf-8') if isinstance(item, bytes) else item
                    for item in r.lrange(key, 0, -1)
                ]
                
            elif key_type == 'set':
                value = [
                    item.decode('utf-8') if isinstance(item, bytes) else item
                    for item in r.smembers(key)
                ]
                
            elif key_type == 'zset':
                value = [
                    {"member": m.decode('utf-8'), "score": s}
                    for m, s in r.zrange(key, 0, -1, withscores=True)
                ]
            else:
                # Use DUMP for unknown types
                dumped = r.dump(key)
                value = base64.b64encode(dumped).decode('utf-8') if dumped else None
                key_type = f"{key_type}_dumped"
                
            backup_data["keys"][key_str] = {
                "type": key_type,
                "ttl": ttl if ttl > 0 else -1,
                "value": value
            }
            print(f"  ✓ {key_str} ({key_type})")
            
        except Exception as e:
            print(f"  ✗ {key_str}: {e}")
    
    # Save to file
    backup_filename = f"redis_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    backup_path = os.path.join(os.path.dirname(__file__), backup_filename)
    
    with open(backup_path, 'w', encoding='utf-8') as f:
        json.dump(backup_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n Backup saved to: {backup_path}")
    print(f" Total keys: {len(backup_data['keys'])}")
    
    return backup_path


if __name__ == "__main__":
    backup_redis()
