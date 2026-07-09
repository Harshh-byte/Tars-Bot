export default function Privacy() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-24">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

      <div className="space-y-6 text-ds-muted leading-8">
        <p>
          Your privacy is important to us. Tars only stores the information
          required to provide its features and improve user experience.
        </p>

        <h2 className="text-xl font-semibold text-ds-text">
          Information We Collect
        </h2>

        <ul className="list-disc pl-6">
          <li>Discord User IDs</li>
          <li>Server IDs</li>
          <li>Settings configured by server administrators</li>
          <li>Command usage for diagnostics</li>
        </ul>

        <h2 className="text-xl font-semibold text-ds-text">
          Data Retention
        </h2>

        <p>
          Data is automatically deleted after six months of inactivity unless
          required for active features.
        </p>

        <h2 className="text-xl font-semibold text-ds-text">
          Third-Party Services
        </h2>

        <p>
          Tars operates through Discord and is subject to Discord's Privacy
          Policy.
        </p>

        <h2 className="text-xl font-semibold text-ds-text">Contact</h2>

        <p>
          For privacy-related questions, contact the developer through Discord.
        </p>
      </div>
    </main>
  );
}