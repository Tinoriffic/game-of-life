from fastapi import APIRouter, HTTPException, status
from fastapi.security import OAuth2AuthorizationCodeBearer
from ..oauth2_config import OAuth2Config
from ..crud.auth_utils import verify_and_register_user, generate_session_token
import httpx

router = APIRouter()

oauth2_scheme = OAuth2AuthorizationCodeBearer(
    authorizationUrl=OAuth2Config.authorize_url,
    tokenUrl=OAuth2Config.token_url,
    scopes={"openid": "Open ID", "email": "Email", "profile": "Profile"}
)

@router.get("/login")
async def login_via_google():
    return {
        "login_url": oauth2_scheme.get_authorization_url(
            client_id=OAuth2Config.client_id,
            scope=OAuth2Config.scope,
            response_type="code",
            redirect_uri=OAuth2Config.callback_url
        )
    }

@router.get("/auth/callback")
async def callback(code: str):
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
    user = await verify_and_register_user(user_info)

    # Create user session and generate token
    session_token = generate_session_token(user)

    return {"session_token": session_token, "user_info": user_info}
