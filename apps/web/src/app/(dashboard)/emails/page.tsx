'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Mail, Plus, Send, Trash2 } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { dateTime } from '@/lib/format';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  isActive: boolean;
  createdAt: string;
}

interface EmailSend {
  id: string;
  toEmail: string;
  subject: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
  errorMessage: string | null;
  lead: { id: string; fullName: string } | null;
  template: { id: string; name: string } | null;
}

export default function EmailsPage() {
  const { data: templates, mutate: mutateTemplates } = useSWR<EmailTemplate[]>('/emails/templates', apiGet);
  const { data: sends } = useSWR<EmailSend[]>('/emails/sends', apiGet);
  const [tab, setTab] = useState<'templates' | 'history'>('templates');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this template?')) return;
    await apiDelete(`/emails/templates/${id}`);
    mutateTemplates();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="text-brand" size={24} />
          <div>
            <h1 className="text-2xl font-bold text-navy-500">Email Automation</h1>
            <p className="text-sm text-slate-500">
              Templates, sends, and drip campaigns. Use {`{{lead.fullName}}`} etc. in subject and body.
            </p>
          </div>
        </div>
        {tab === 'templates' && (
          <button className="btn-primary" onClick={() => { setEditing(null); setShowNew(true); }}>
            <Plus size={16} /> New Template
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          className={`px-4 py-2 text-sm font-semibold ${
            tab === 'templates' ? 'border-b-2 border-brand text-brand' : 'text-slate-500'
          }`}
          onClick={() => setTab('templates')}
        >
          Templates ({templates?.length ?? 0})
        </button>
        <button
          className={`px-4 py-2 text-sm font-semibold ${
            tab === 'history' ? 'border-b-2 border-brand text-brand' : 'text-slate-500'
          }`}
          onClick={() => setTab('history')}
        >
          Send History
        </button>
      </div>

      {tab === 'templates' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {templates?.map((t) => (
            <div key={t.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-navy-500">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.subject}</div>
                </div>
                <button onClick={() => deleteTemplate(t.id)} className="text-red-600 hover:underline">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-3 max-h-32 overflow-hidden rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                <div className="line-clamp-5" dangerouslySetInnerHTML={{ __html: t.bodyHtml }} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Created {dateTime(t.createdAt)}</span>
                <button onClick={() => { setEditing(t); setShowNew(true); }} className="font-semibold text-brand hover:underline">
                  Edit
                </button>
              </div>
            </div>
          ))}
          {templates && templates.length === 0 && (
            <div className="card col-span-full p-10 text-center text-sm text-slate-500">
              No templates yet. Create your first one with the button above.
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sends?.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-xs">{dateTime(s.createdAt)}</td>
                  <td className="px-4 py-3 text-xs">{s.toEmail}</td>
                  <td className="px-4 py-3 text-sm">{s.subject}</td>
                  <td className="px-4 py-3 text-xs">{s.lead?.fullName ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{s.template?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${
                      s.status === 'SENT' || s.status === 'DELIVERED' || s.status === 'OPENED' ? 'bg-emerald-100 text-emerald-700' :
                      s.status === 'FAILED' || s.status === 'BOUNCED' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-500'
                    }`} title={s.errorMessage ?? ''}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
              {sends && sends.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No emails sent yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <TemplateModal
          template={editing}
          onClose={() => { setShowNew(false); setEditing(null); }}
          onSaved={() => mutateTemplates()}
        />
      )}
    </div>
  );
}

/** Ready-to-use starter templates — click to prefill the form, then customise. */
const STARTER_TEMPLATES: { label: string; name: string; subject: string; bodyHtml: string }[] = [
  {
    label: 'Welcome',
    name: 'Welcome - Enquiry Received',
    subject: 'Thanks for reaching out, {{lead.firstName}}',
    bodyHtml:
      '<p>Hi {{lead.firstName}},</p>\n' +
      "<p>Thanks for getting in touch — we've received your enquiry and a member of our team will reach out to you shortly.</p>\n" +
      '<p>In the meantime, feel free to reply to this email with any questions you have.</p>\n' +
      '<p>Best regards,<br/>The Team</p>',
  },
  {
    label: 'Follow-up',
    name: 'Follow-up - No Response',
    subject: 'Still interested, {{lead.firstName}}?',
    bodyHtml:
      '<p>Hi {{lead.firstName}},</p>\n' +
      "<p>I tried reaching you earlier and didn't want this to slip through. Are you still looking for help with this?</p>\n" +
      "<p>Just reply with a good time to talk and I'll make it work.</p>\n" +
      '<p>Best regards,<br/>The Team</p>',
  },
  {
    label: 'Proposal',
    name: 'Proposal - Details Sent',
    subject: 'The details you asked for, {{lead.firstName}}',
    bodyHtml:
      '<p>Hi {{lead.firstName}},</p>\n' +
      '<p>As promised, here is a quick summary of what we discussed:</p>\n' +
      '<ul><li><strong>What you get:</strong> ...</li><li><strong>Timeline:</strong> ...</li><li><strong>Investment:</strong> ...</li></ul>\n' +
      '<p>Happy to jump on a short call to walk you through it. When works best for you?</p>\n' +
      '<p>Best regards,<br/>The Team</p>',
  },
  {
    label: 'Re-engage',
    name: 'Re-engagement - Cold Lead',
    subject: 'Should I close your file, {{lead.firstName}}?',
    bodyHtml:
      '<p>Hi {{lead.firstName}},</p>\n' +
      "<p>I haven't heard back, so I wanted to check in one last time before closing things on my end.</p>\n" +
      "<p>If now isn't the right time, no problem at all — just let me know and I'll follow up later. If you're ready, reply here and we'll pick up where we left off.</p>\n" +
      '<p>Best regards,<br/>The Team</p>',
  },
  {
    label: 'Thank You',
    name: 'Thank You - Welcome Aboard',
    subject: 'Welcome aboard, {{lead.firstName}}!',
    bodyHtml:
      '<p>Hi {{lead.firstName}},</p>\n' +
      "<p>Thank you for choosing to work with us — we're glad to have you on board.</p>\n" +
      '<p>Our team will be in touch within one working day to get you started.</p>\n' +
      '<p>If you need anything at all, just reply to this email.</p>\n' +
      '<p>Best regards,<br/>The Team</p>',
  },
];

/** Replace {{lead.*}} variables with sample values so the user can preview the email. */
function fillPreview(text: string): string {
  return text
    .replaceAll('{{lead.fullName}}', 'Rahul Sharma')
    .replaceAll('{{lead.firstName}}', 'Rahul')
    .replaceAll('{{lead.email}}', 'rahul@example.com')
    .replaceAll('{{lead.phone}}', '+91 90000 00000')
    .replaceAll('{{lead.city}}', 'Nashik');
}

function TemplateModal({
  template,
  onClose,
  onSaved,
}: {
  template: EmailTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: template?.name ?? '',
    subject: template?.subject ?? STARTER_TEMPLATES[0]!.subject,
    bodyHtml: template?.bodyHtml ?? STARTER_TEMPLATES[0]!.bodyHtml,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      if (template) {
        await apiPost(`/emails/templates/${template.id}`, form);
      } else {
        await apiPost('/emails/templates', form);
      }
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4">
      <form onSubmit={save} className="card w-full max-w-2xl space-y-3 p-6">
        <h3 className="text-lg font-bold text-navy-500">
          {template ? 'Edit Template' : 'New Email Template'}
        </h3>
        {!template && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-500">
              Start from a ready-made template:
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTER_TEMPLATES.map((st) => (
                <button
                  key={st.label}
                  type="button"
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-navy-500 hover:border-brand hover:text-brand"
                  onClick={() =>
                    setForm({ name: st.name, subject: st.subject, bodyHtml: st.bodyHtml })
                  }
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <input
          className="input"
          placeholder="Template name (internal)"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="input"
          placeholder="Subject (supports {{lead.fullName}}, {{lead.firstName}})"
          required
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Email body (HTML)</span>
          <div className="flex gap-1 rounded-lg border border-slate-200 p-0.5">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className={`rounded px-3 py-1 text-xs font-semibold ${
                !showPreview ? 'bg-brand text-white' : 'text-slate-500'
              }`}
            >
              Write
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className={`rounded px-3 py-1 text-xs font-semibold ${
                showPreview ? 'bg-brand text-white' : 'text-slate-500'
              }`}
            >
              Preview
            </button>
          </div>
        </div>
        {showPreview ? (
          <div className="min-h-[260px] overflow-auto rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <span className="text-slate-400">Subject:</span>{' '}
              <strong className="text-navy-500">
                {fillPreview(form.subject) || '(no subject)'}
              </strong>
            </div>
            <div
              className="p-4 text-sm leading-relaxed text-slate-700"
              dangerouslySetInnerHTML={{ __html: fillPreview(form.bodyHtml) || '<p>Nothing to preview yet.</p>' }}
            />
          </div>
        ) : (
          <textarea
            className="input min-h-[260px] font-mono text-xs"
            placeholder="HTML body"
            value={form.bodyHtml}
            onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })}
          />
        )}
        <p className="text-xs text-slate-500">
          Variables: {`{{lead.fullName}}`}, {`{{lead.firstName}}`}, {`{{lead.email}}`}, {`{{lead.phone}}`}, {`{{lead.city}}`} — Preview fills them with sample data.
        </p>
        {err && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : template ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
