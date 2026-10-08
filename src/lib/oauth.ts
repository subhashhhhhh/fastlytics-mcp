import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getConfig } from './config.js';

/**
 * OAuth resource-server support for the hosted (HTTP) transport.
 *
 * Fastlytics accounts live in Supabase Auth, whose OAuth 2.1 server is the
 * authorization server. Claude discovers it through the protected resource
 * metadata below (RFC 9728), registers itself via Supabase's dynamic client
 * registration, and sends the resulting Supabase access token as a Bearer.
 */

function issuer(): string {
  return `${getConfig().SUPABASE_URL}/auth/v1`;
}

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJwks() {
  jwks ??= createRemoteJWKSet(new URL(`${issuer()}/.well-known/jwks.json`));
  return jwks;
}

export function resourceUrl(): string {
  return `${getConfig().MCP_PUBLIC_URL}/mcp`;
}

export function resourceMetadataUrl(): string {
  return `${getConfig().MCP_PUBLIC_URL}/.well-known/oauth-protected-resource/mcp`;
}

export function protectedResourceMetadata() {
  return {
    resource: resourceUrl(),
    authorization_servers: [issuer()],
    scopes_supported: ['openid', 'email'],
    bearer_methods_supported: ['header'],
    resource_name: 'Fastlytics',
    resource_documentation: 'https://fastlytics.app/mcp',
  };
}

/**
 * Accept only tokens minted by the Supabase OAuth server: same issuer and
 * audience as a normal session token, plus the client_id claim that Supabase
 * adds to OAuth-issued tokens. Plain browser session tokens are rejected so a
 * leaked web session cannot be replayed against the MCP endpoint.
 */
export async function verifyOAuthAccessToken(token: string): Promise<{ userId: string; clientId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: issuer(),
      audience: 'authenticated',
    });
    const clientId = payload.client_id;
    if (typeof clientId !== 'string' || !clientId || typeof payload.sub !== 'string') {
      return null;
    }
    return { userId: payload.sub, clientId };
  } catch {
    return null;
  }
}
