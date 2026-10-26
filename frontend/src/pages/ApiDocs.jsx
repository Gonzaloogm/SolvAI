import { useTranslation } from 'react-i18next';
import { Shield, Code, Server, PlayCircle } from 'lucide-react';

export default function ApiDocs() {
  const { t } = useTranslation();

  return (
    <div className="page-enter max-w-4xl mx-auto pb-12">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary">API Documentation</h1>
        <p className="text-sm text-muted">
          Integrate SolvAI into your application using our REST API.
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-[var(--brand-blue)]" />
          <h2 className="text-lg font-semibold text-primary">Authentication</h2>
        </div>
        <p className="text-sm text-secondary mb-4">
          Authenticate your API requests by including your secret API key in the request headers. 
          You can manage your API keys in the <a href="/settings" className="text-[var(--brand-blue)] hover:underline">Settings</a> page.
        </p>
        <div className="bg-[#1e1e1e] rounded-md p-4 overflow-x-auto">
          <code className="text-sm text-[#d4d4d4]">
            <span className="text-[#9cdcfe]">X-API-Key</span>: sk-solv-...
          </code>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <PlayCircle className="w-6 h-6 text-[#1a9e6e]" />
          <h2 className="text-lg font-semibold text-primary">Assess Solvency (POST /v1/assess)</h2>
        </div>
        <p className="text-sm text-secondary mb-4">
          Triggers a new solvency report generation.
        </p>
        
        <h3 className="text-sm font-semibold text-primary mb-2">Request</h3>
        <div className="bg-[#1e1e1e] rounded-md p-4 overflow-x-auto mb-4">
          <pre className="text-sm text-[#d4d4d4]">
{`curl -X POST https://api.solvai.com/v1/assess \\
  -H "X-API-Key: your-api-key"`}
          </pre>
        </div>

        <h3 className="text-sm font-semibold text-primary mb-2">Response</h3>
        <div className="bg-[#1e1e1e] rounded-md p-4 overflow-x-auto">
          <pre className="text-sm text-[#d4d4d4]">
{`{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "processing"
}`}
          </pre>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Server className="w-6 h-6 text-[#9333ea]" />
          <h2 className="text-lg font-semibold text-primary">Get Assessment (GET /v1/assess/{'{id}'})</h2>
        </div>
        <p className="text-sm text-secondary mb-4">
          Check the status or retrieve the result of a generated solvency report.
        </p>
        <div className="bg-[#1e1e1e] rounded-md p-4 overflow-x-auto">
          <pre className="text-sm text-[#d4d4d4]">
{`curl -X GET https://api.solvai.com/v1/assess/123e4567-e89b-12d3-a456-426614174000 \\
  -H "X-API-Key: your-api-key"`}
          </pre>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Code className="w-6 h-6 text-[#ea580c]" />
          <h2 className="text-lg font-semibold text-primary">Verify Report (GET /v1/verify/{'{token}'})</h2>
        </div>
        <p className="text-sm text-secondary mb-4">
          Verify a shared report using its public token.
        </p>
        <div className="bg-[#1e1e1e] rounded-md p-4 overflow-x-auto">
          <pre className="text-sm text-[#d4d4d4]">
{`curl -X GET https://api.solvai.com/v1/verify/abc123xyz \\
  -H "X-API-Key: your-api-key"`}
          </pre>
        </div>
      </div>
    </div>
  );
}
