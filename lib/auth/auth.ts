export interface RegisterAgentPayload {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    phone: string;
    whatsapp_number: string;
    business_name: string;
    city: string;
    plan: string;
}

export async function RegisterAgent(input: RegisterAgentPayload): Promise<any> {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;

    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: input.name,
            email: input.email,
            password: input.password,
            password_confirmation: input.password_confirmation,
            phone: input.phone,
            whatsapp_number: input.whatsapp_number,
            business_name: input.business_name,
            city: input.city,
            plan: input.plan
        })
    });

    const json = await res.json();

    if (!res.ok) {
        const err: any = new Error(json.message || 'Pendaftaran gagal');
        err.errors = json.errors || {};
        err.status = res.status;
        throw err;
    }

    return json;
}
