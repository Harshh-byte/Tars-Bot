export default function Terms() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-24">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

      <div className="space-y-6 text-ds-muted leading-8">
        <p>
          By using Tars, you agree to these Terms of Service.
        </p>

        <h2 className="text-xl font-semibold text-ds-text">
          Acceptable Use
        </h2>

        <ul className="list-disc pl-6">
          <li>Do not abuse or exploit the bot.</li>
          <li>Do not use the bot for illegal activities.</li>
          <li>Do not attempt to disrupt the service.</li>
        </ul>

        <h2 className="text-xl font-semibold text-ds-text">
          Availability
        </h2>

        <p>
          Tars is provided "as is" without guarantees of uptime or
          functionality.
        </p>

        <h2 className="text-xl font-semibold text-ds-text">
          Limitation of Liability
        </h2>

        <p>
          The developer is not responsible for any damages resulting from the
          use of Tars.
        </p>

        <h2 className="text-xl font-semibold text-ds-text">
          Changes
        </h2>

        <p>
          These terms may change at any time without prior notice.
        </p>
      </div>
    </main>
  );
}