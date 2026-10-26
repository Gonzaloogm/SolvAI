from app.core.security import (
    create_access_token,
    decrypt_dict,
    encrypt_dict,
    get_password_hash,
    verify_password,
)


def test_credentials_round_trip_and_are_not_stored_in_clear():
    secret = {"client_id": "abc", "client_secret": "s3cr3t"}

    token = encrypt_dict(secret)

    assert "s3cr3t" not in token
    assert decrypt_dict(token) == secret


def test_password_hashing():
    hashed = get_password_hash("correct horse")

    assert hashed != "correct horse"
    assert verify_password("correct horse", hashed)
    assert not verify_password("wrong", hashed)


def test_access_token_is_a_jwt():
    token = create_access_token({"sub": "user-id"})

    assert token.count(".") == 2
