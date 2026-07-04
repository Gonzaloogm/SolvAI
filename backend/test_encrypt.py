import asyncio
from app.core.security import encrypt_dict, decrypt_dict

def test():
    api_key = "sk_test_123"
    enc = encrypt_dict({"api_key": api_key})
    print("Encrypted length:", len(enc))
    dec = decrypt_dict(enc)
    print("Decrypted:", dec)

test()
