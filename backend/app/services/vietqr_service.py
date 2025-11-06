"""
VietQR Service - Tạo QR code thanh toán

API Documentation: https://api.vietqr.io/docs/
"""
import httpx
from typing import Optional


class VietQRService:
    """
    Service tạo QR code thanh toán qua VietQR API
    """
    API_URL = "https://api.vietqr.io/v2/generate"
    
    @staticmethod
    async def generate_qr(
        account_no: str,
        account_name: str,
        acq_id: str,  # Bank ID (VD: "970415" cho Vietinbank)
        amount: float,
        add_info: str,
        template: str = "compact"
    ) -> dict:
        """
        Tạo QR code thanh toán
        
        Args:
            account_no: Số tài khoản ngân hàng
            account_name: Tên chủ tài khoản
            acq_id: Mã ngân hàng (VD: "970415" - Vietinbank, "970422" - MB Bank)
            amount: Số tiền (VND)
            add_info: Nội dung chuyển khoản
            template: Template QR ("compact", "compact2", "qr_only", "print")
        
        Returns:
            dict: {
                "code": "00",
                "desc": "Success",
                "data": {
                    "qrCode": "data:image/png;base64,...",
                    "qrDataURL": "https://..."
                }
            }
        """
        payload = {
            "accountNo": account_no,
            "accountName": account_name,
            "acqId": acq_id,
            "amount": int(amount),  # Phải là số nguyên
            "addInfo": add_info,
            "format": "text",
            "template": template
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(VietQRService.API_URL, json=payload)
            response.raise_for_status()
            return response.json()
    
    @staticmethod
    async def create_payment_qr(
        ma_dat_ve: str,
        amount: float,
        account_no: str = "0921508957",
        account_name: str = "VU KHANH NAM",
        bank_id: str = "970423"  # TP Bank (Tien Phong Commercial Joint Stock Bank)
    ) -> Optional[str]:
        """
        Tạo QR code cho một booking
        
        Bank IDs:
        - 970423: TP Bank
        - 970422: MB Bank  
        - 970415: Vietinbank
        - 970436: Vietcombank
        
        Returns:
            str: Base64 encoded QR code image (data:image/png;base64,...)
            None: Nếu có lỗi
        """
        try:
            add_info = f"VOOBUS {ma_dat_ve}"  # Nội dung chuyển khoản
            
            result = await VietQRService.generate_qr(
                account_no=account_no,
                account_name=account_name,
                acq_id=bank_id,
                amount=amount,
                add_info=add_info,
                template="compact2"
            )
            
            if result.get("code") == "00":
                data = result.get("data", {})
                
                # VietQR API có thể trả về qrDataURL hoặc qrCode
                # qrDataURL: URL link đến ảnh QR (https://...)
                # qrCode: Base64 string (có hoặc không có prefix)
                qr_url = data.get("qrDataURL")
                qr_code = data.get("qrCode")
                
                # Ưu tiên dùng qrDataURL (link) vì nó nhẹ hơn
                if qr_url:
                    print(f"✅ QR generated (URL) for {ma_dat_ve}: {qr_url[:80]}...")
                    return qr_url
                elif qr_code:
                    # Nếu qrCode chưa có prefix, thêm vào
                    if not qr_code.startswith("data:image"):
                        qr_code = f"data:image/png;base64,{qr_code}"
                    print(f"✅ QR generated (base64) for {ma_dat_ve}: {len(qr_code)} chars")
                    return qr_code
                else:
                    print(f"❌ VietQR: No QR data in response")
                    return None
            else:
                print(f"❌ VietQR Error: {result.get('desc')}")
                return None
                
        except Exception as e:
            print(f"❌ Error generating QR: {str(e)}")
            import traceback
            traceback.print_exc()
            return None


vietqr_service = VietQRService()
