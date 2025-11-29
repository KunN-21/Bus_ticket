"""
Utility functions and helpers
"""
from datetime import datetime, timezone, timedelta

# Timezone for Ho Chi Minh (UTC+7)
HO_CHI_MINH_TZ = timezone(timedelta(hours=7))

def get_current_time_hcm():
    """
    Get current datetime in Ho Chi Minh timezone (UTC+7)
    """
    return datetime.now(HO_CHI_MINH_TZ)

def get_current_timestamp_hcm():
    """
    Get current timestamp in Ho Chi Minh timezone
    """
    return get_current_time_hcm().timestamp()

def format_datetime_hcm(dt: datetime = None):
    """
    Format datetime to ISO string in Ho Chi Minh timezone
    """
    if dt is None:
        dt = get_current_time_hcm()
    elif dt.tzinfo is None:
        # If naive datetime, assume it's UTC and convert to HCM
        dt = dt.replace(tzinfo=timezone.utc).astimezone(HO_CHI_MINH_TZ)
    else:
        # If already timezone-aware, convert to HCM
        dt = dt.astimezone(HO_CHI_MINH_TZ)
    return dt.isoformat()

# Import future utility functions here
# Example: from .validators import validate_phone, validate_cccd

__all__ = ['get_current_time_hcm', 'get_current_timestamp_hcm', 'format_datetime_hcm', 'HO_CHI_MINH_TZ']
