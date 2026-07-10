from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
new_hash = pwd_context.hash("EasyFAQ2026!")
print(f"NEW_HASH: {new_hash}")
