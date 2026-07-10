import sys
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hash_val = "$2b$12$ZuaD7IXc49k2qXruwd6vG.5yjdd1YJdxzbUF6rvGS7xeI/NiyWu7C"

passwords_to_try = [
    "EasyFAQ2026!",
    "easyfaq2026!",
    "EasyFAQ2026",
    "easyFAQ2026!",
    "EasyFaq2026!",
]

for p in passwords_to_try:
    res = pwd_context.verify(p, hash_val)
    print(f"Password '{p}': {'MATCH' if res else 'NO MATCH'}")
