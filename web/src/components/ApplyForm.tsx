import React, { useRef, useState } from "react";

interface Props {
  onSubmit: (formData: FormData) => void;
  disabled: boolean;
}

export function ApplyForm({ onSubmit, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* CV Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          CV / Resume <span className="text-red-400">*</span>
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-gray-600 hover:border-brand cursor-pointer transition-colors"
        >
          <span className="text-2xl">📄</span>
          <span className="text-sm text-gray-400">
            {fileName || "Click to upload PDF or .txt"}
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          name="cv"
          accept=".pdf,.txt"
          required
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
        />
      </div>

      {/* Role + Salary */}
      <div className="grid grid-cols-2 gap-4">
        <Field name="role" label="Target Role" placeholder='e.g. "Software Engineer"' required />
        <Field name="salary" label="Target Salary" placeholder='e.g. "€75,000"' required />
      </div>

      {/* Count + Seniority */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="field-label">Applications</label>
          <input
            type="number" name="count" defaultValue={10} min={1} max={50}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Seniority</label>
          <select name="seniority" className="field-input" defaultValue="mid">
            {["junior", "early-career", "mid", "senior", "lead"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Location + Remote */}
      <div className="grid grid-cols-2 gap-4">
        <Field name="location" label="Location" placeholder='e.g. "Berlin, Germany"' />
        <div>
          <label className="field-label">Remote</label>
          <select name="remote" className="field-input" defaultValue="">
            <option value="">Any</option>
            {["remote", "hybrid", "onsite"].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stack + Industry */}
      <Field
        name="stack" label="Tech Stack"
        placeholder='e.g. "TypeScript, React, Node.js"'
        hint="Comma-separated"
      />
      <Field
        name="industry" label="Industry"
        placeholder='e.g. "FinTech, SaaS"'
        hint="Comma-separated (optional)"
      />
      <Field
        name="exclude" label="Exclude Companies"
        placeholder='e.g. "Amazon, Meta"'
        hint="Comma-separated (optional)"
      />

      <button
        type="submit"
        disabled={disabled}
        className="w-full py-3 px-6 bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-colors flex items-center justify-center gap-2"
      >
        {disabled ? (
          <>
            <span className="animate-spin text-lg">⟳</span> Agent Running…
          </>
        ) : (
          <> ▶ Start Job Agent</>
        )}
      </button>
    </form>
  );
}

function Field({
  name, label, placeholder, required, hint,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="field-label">
        {label} {required && <span className="text-red-400">*</span>}
        {hint && <span className="text-gray-500 font-normal ml-1">({hint})</span>}
      </label>
      <input
        type="text" name={name} placeholder={placeholder}
        required={required}
        className="field-input"
      />
    </div>
  );
}
