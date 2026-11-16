const UNAVAILABLE_MESSAGE = 'Sign-in is temporarily unavailable. Please try again.';

export class LoginResponseError extends Error {
  constructor(message = UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = 'LoginResponseError';
  }
}

export type LoginResponse =
  | { success: true }
  | { success: false; error: string; needsVerification: boolean };

// Infrastructure failures can return an HTML error page instead of the API's JSON.
// Never expose that page or a JSON parser error in the sign-in form.
export async function readLoginResponse(response: Response): Promise<LoginResponse> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new LoginResponseError();
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new LoginResponseError();
  }

  const payload = data as Record<string, unknown>;
  if (!response.ok) {
    return {
      success: false,
      error: typeof payload.error === 'string' && payload.error.trim()
        ? payload.error
        : response.status === 429
          ? 'Too many sign-in attempts. Please wait a few minutes and try again.'
          : response.status === 401
            ? 'Invalid email or password.'
            : UNAVAILABLE_MESSAGE,
      needsVerification: payload.needsVerification === true,
    };
  }

  if (payload.success !== true) {
    throw new LoginResponseError();
  }
  return { success: true };
}
