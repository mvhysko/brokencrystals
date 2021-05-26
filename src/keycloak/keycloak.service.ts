import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ok } from 'assert';
import { HttpClientService } from '../httpclient/httpclient.service';
import { KeyCloakConfigProperties } from './keycloak.config.properties';
import jwkToPem, { JWK } from 'jwk-to-pem';
import { stringify } from 'qs';
import { verify } from 'jsonwebtoken';

export interface OIDCIdentityConfig {
  issuer?: string;
  introspection_endpoint?: string;
  jwks_uri?: string;
  token_endpoint?: string;
}

export interface RegisterUserData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface GenerateTokenData {
  username: string;
  password: string;
}

export interface Token {
  readonly token_type: string;
  readonly access_token: string;
  readonly refresh_token?: string;
  readonly refresh_expires_in: number;
  readonly expires_in?: number;
}

interface ClientCredentials {
  client_id: string;
  client_secret?: string;
}

@Injectable()
export class KeyCloakService {
  private log: Logger = new Logger(KeyCloakService.name);
  private readonly server_uri: string;
  private readonly realm: string;
  private config: OIDCIdentityConfig;
  private readonly clientAdmin: ClientCredentials;
  private readonly clientUser: ClientCredentials;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpClient: HttpClientService,
  ) {
    this.server_uri = this.configService.get(
      KeyCloakConfigProperties.ENV_KEYCLOAK_SERVER_URI,
    );
    this.realm = this.configService.get(
      KeyCloakConfigProperties.ENV_KEYCLOAK_REALM,
    );

    this.clientUser = {
      client_id: this.configService.get(
        KeyCloakConfigProperties.ENV_KEYCLOAK_USER_CLIENT_ID,
      ),
      client_secret: this.configService.get(
        KeyCloakConfigProperties.ENV_KEYCLOAK_USER_CLIENT_SECRET,
      ),
    };

    this.clientAdmin = {
      client_id: this.configService.get(
        KeyCloakConfigProperties.ENV_KEYCLOAK_ADMIN_CLIENT_ID,
      ),
      client_secret: this.configService.get(
        KeyCloakConfigProperties.ENV_KEYCLOAK_ADMIN_CLIENT_SECRET,
      ),
    };

    ok(this.realm, '"realm" is not defined.');
    ok(this.server_uri, '"metadata_uri" is not defined.');
    ok(this.clientUser.client_id, '"client_id" is not defined.');
    ok(this.clientAdmin.client_id, 'Admin "client_id" is not defined.');
    ok(this.clientAdmin.client_secret, 'Admin "client_secret" is not defined.');

    this.discovery().catch((err: any) => console.error(err));
  }

  public async verifyToken(token: string, kid: string) {
    const pems: Map<string, string> = await this.getJWKs();

    if (!pems.has(kid)) {
      throw new UnauthorizedException(
        'Authorization header contains an invalid JWT token.',
      );
    }

    return verify(token, pems.get(kid), {
      issuer: this.config.issuer,
    });
  }

  public async introspectToken(token: string): Promise<Record<string, string>> {
    ok(
      (this.config as OIDCIdentityConfig).introspection_endpoint,
      'Missing "introspection_endpoint"',
    );

    const { access_token, token_type } = await this.generateToken();
    const data = stringify({ token });

    return this.httpClient.post(this.config.introspection_endpoint, data, {
      headers: {
        Authorization: `${token_type} ${access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  public async registerUser({
    firstName,
    lastName,
    email,
    password,
  }: RegisterUserData): Promise<void> {
    this.log.debug(`Called registerUser`);

    const { access_token, token_type } = await this.generateToken();

    console.log(`${token_type} ${access_token}`);
    try {
      await this.httpClient.post(
        `${this.server_uri}/admin/realms/${this.realm}/users`,
        {
          firstName,
          lastName,
          email,
          enabled: true,
          username: email,
          credentials: [
            {
              type: 'password',
              value: password,
              temporary: false,
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `${token_type} ${access_token}`,
          },
          responseType: 'json',
        },
      );
    } catch (err) {
      this.log.error(err);
      throw err;
    }
  }

  public async generateToken(tokenData?: GenerateTokenData): Promise<Token> {
    let data: string;

    if (tokenData) {
      data = stringify({
        ...tokenData,
        grant_type: 'password',
        client_id: this.clientUser.client_id,
        client_secret: this.clientUser.client_secret,
      });
    } else {
      data = stringify({
        grant_type: 'client_credentials',
        client_id: this.clientAdmin.client_id,
        client_secret: this.clientAdmin.client_secret,
      });
    }

    console.log(data);
    try {
      return this.httpClient.post<Token>(this.config.token_endpoint, data, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        responseType: 'json',
      });
    } catch (err) {
      this.log.error(err);
      throw err;
    }
  }

  private async discovery(): Promise<void> {
    this.config = (await this.httpClient.loadJSON(
      `${this.server_uri}/realms/${this.realm}/.well-known/openid-configuration`,
    )) as OIDCIdentityConfig;
  }

  private async getJWKs(): Promise<Map<string, string>> {
    ok((this.config as OIDCIdentityConfig).jwks_uri, 'Missing "jwks_uri"');

    const data = await this.httpClient.loadJSON<{
      keys: (JWK & { kid: string })[];
    }>(this.config.jwks_uri);

    if (!data.keys) {
      throw new InternalServerErrorException(
        'Internal error occurred downloading JWKS data.',
      );
    }

    return new Map<string, string>(
      data.keys.map((key: JWK & { kid: string }) => [key.kid, jwkToPem(key)]),
    );
  }
}
