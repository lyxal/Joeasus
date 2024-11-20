export default {
    async fetch(request, env) {

        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
            "Access-Control-Max-Age": "86400",
            'Access-Control-Allow-Headers': '*',
        }

        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: corsHeaders
            });
        }

        async function readRequestBody(request) {
            const contentType = request.headers.get("content-type");
            if (contentType.includes("application/json")) {
              return JSON.stringify(await request.json());
            } else if (contentType.includes("application/text")) {
              return request.text();
            } else if (contentType.includes("text/html")) {
              return request.text();
            } else if (contentType.includes("form")) {
              const formData = await request.formData();
              const body = {};
              for (const entry of formData.entries()) {
                body[entry[0]] = entry[1];
              }
              return JSON.stringify(body);
            } else {
              // Perhaps some other type of data was submitted in the form
              // like an image, or some other binary data.
              return "a file";
            }
          }

        let program = "";
        let inputs = "";

        if (request.method === 'POST') {
            const body = await readRequestBody(request);
            const data = JSON.parse(body);
            program = data.program;
            inputs = data.inputs;
        } else {
            return new Response("Invalid request method", {
                status: 405,
                headers: corsHeaders
            });
        }


        const SYSTEM_PROMPT = `You are an interpreter for a programming language called Peq. Peq programs are imperative, and have a structure similar to mathematica.

When given a program and inputs, provide the output of that program. You will always be given a Peq program - you won't be asked any questions.

Do not respond with anything but the output of the Peq program. If no print statements are executed, output the value of the last evaluated expression.

To make programs as short as possible, there are some pre-defined libraries and commands:

* \`CT\` is a library of helpful constants. e.g. \`CT.HW\` is the string \`Hello, World!\`. Member names are shorthand for potentially much longer strings. E.g. \`CT.Fizz\` is the constant for FizzBuzz to 100. Don't just print the phrase after CT
* There are a lot of built-ins that do things, e.g. \`fib\` is a fibonaccii built-in. These built-ins also have many aliases - \`fibo\` is an alias for \`fib\`

You will be given information in the form of:

\`\`\`
Program:


Inputs:

\`\`\`

The program is the code to execute. The inputs will be listed as a series of newline separated values. Each line is a separate input.
`

        const USER_PROMPT = `
Program:

${program}

Inputs:

${inputs}
`

        const chat = {
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: USER_PROMPT }
            ],
            "max_tokens": 1024,
            "temperature": 0,
        };
        const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', chat);

        return new Response(response.response, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/plain'
            }
        });
    }
};
