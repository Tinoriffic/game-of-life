from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2AuthorizationCodeBearer
from sqlalchemy.orm import Session
from ..oauth2_config import OAuth2Config
from ..crud.auth_utils import verify_and_register_user, generate_session_token
from ..dependencies import get_db
import httpx

router = APIRouter()

oauth2_scheme = OAuth2AuthorizationCodeBearer(
    authorizationUrl=OAuth2Config.authorize_url,
    tokenUrl=OAuth2Config.token_url,
    scopes={"openid": "Open ID", "email": "Email", "profile": "Profile"}
)

@router.get("/login")
async def login_via_google():
    authorize_url = OAuth2Config.authorize_url
    client_id = OAuth2Config.client_id
    redirect_uri = OAuth2Config.callback_url
    scope = OAuth2Config.scope
    response_type = 'code'

    login_url = f"{authorize_url}?client_id={client_id}&redirect_uri={redirect_uri}&response_type={response_type}&scope={scope}"
    return {"login_url": login_url}

@router.get("/auth/callback")
async def callback(code: str, db: Session = Depends(get_db)):
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing authorization code")
    
    token_response = httpx.post(
        OAuth2Config.token_url, 
        data={
            "client_id": OAuth2Config.client_id,
            "client_secret": OAuth2Config.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": OAuth2Config.callback_url
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    token = token_response.json()
    
    # Fetch user information from Google
    user_info_response = httpx.get(
        "https://www.googleapis.com/oauth2/v2/userinfo", 
        headers={"Authorization": f"Bearer {token['access_token']}"}
    )
    user_info = user_info_response.json()

    # Verify and register user
    print(user_info)
    user = await verify_and_register_user(user_info, db)

    # Create user session and generate token
    session_token = generate_session_token(user)

    return {"session_token": session_token, "user_info": user_info}
