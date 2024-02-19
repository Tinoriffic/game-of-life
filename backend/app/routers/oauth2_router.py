from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2AuthorizationCodeBearer
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from ..config import Config
from ..oauth2_config import OAuth2Config
from ..crud.auth_utils import handle_user_authentication, issue_registration_token
from ..dependencies import get_db
import httpx

frontend_url = Config.FRONTEND_URL
if not frontend_url:
    raise ValueError("FRONTEND_URL environment variable is not set!")

router = APIRouter()

oauth2_scheme = OAuth2AuthorizationCodeBearer(
    authorizationUrl=OAuth2Config.authorize_url,
    tokenUrl=OAuth2Config.token_url,
    scopes={"openid": "Open ID", "email": "Email", "profile": "Profile"}
)

@router.get("/api/login")
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
    print(f"Fetched User Info: {user_info}")
    result = await handle_user_authentication(user_info, db)
    
    if result["type"] == "existing":
        # Redirect existing user to main screen with session token
        if 'access_token' in result and 'refresh_token' in result:
            frontend_request = f"{frontend_url}/auth/callback?accessToken={result['access_token']}&refreshToken={result['refresh_token']}"
            print(f"Redirecting to {frontend_request}")
            return RedirectResponse(url=frontend_request)
        else:
            print("Error: Access token or refresh token is missing from the authentication result.")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error")
    else:
        # Redirect new user to 'Choose Username' page
        # New users: Store user_info in the database with a 'registration in progress' flag
        registration_token = issue_registration_token(result["user_info"])
        frontend_request = f"{frontend_url}/api/user-setup?token={registration_token}"
        return RedirectResponse(url=frontend_request)
