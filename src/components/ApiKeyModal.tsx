import React, { useState, useEffect } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, ExternalLink, RefreshCw, X, Sliders, Cpu } from 'lucide-react';
import { GroqSettings } from '../types';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GroqSettings;
  onSaveSettings: (settings: GroqSettings) => void;
  hasServerKey?: boolean;
}

export const GROQ_MODELS = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    badge: 'Recommended',
    description: 'Flagship reasoning and comprehensive synthesis with precise citation grounding',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    badge: 'Ultra Fast',
    description: 'Sub-second response speed, ideal for rapid research scanning and queries',
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B (32k Context)',
    badge: 'Long Context',
    description: 'MoE architecture with large context window for comprehensive cross-paper synthesis',
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B IT',
    badge: 'Google',
    description: 'High-precision structured responses and analytical extraction',
  },
];

export function ApiKeyModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  hasServerKey = false,
}: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model || 'llama-3.3-70b-versatile');
  const [topK, setTopK] = useState(settings.topK || 5);
  const [temperature, setTemperature] = useState(settings.temperature ?? 0.2);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setApiKey(settings.apiKey);
    setModel(settings.model || 'llama-3.3-70b-versatile');
    setTopK(settings.topK || 5);
    setTemperature(settings.temperature ?? 0.2);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    const keyToTest = apiKey.trim();
    if (!keyToTest && !hasServerKey) {
      setErrorMessage('Please enter an API key to test.');
      setValidationStatus('invalid');
      return;
    }

    setIsValidating(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/verify-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-groq-api-key': keyToTest,
        },
        body: JSON.stringify({ apiKey: keyToTest }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setValidationStatus('valid');
      } else {
        setValidationStatus('invalid');
        setErrorMessage(data.error || 'Key validation failed.');
      }
    } catch (err: any) {
      setValidationStatus('invalid');
      setErrorMessage(err?.message || 'Network error while validating key.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = () => {
    onSaveSettings({
      apiKey: apiKey.trim(),
      model,
      topK,
      temperature,
    });
    onClose();
  };

  return (
    <div
      id="api-key-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
    >
      <div
        id="api-key-modal-card"
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Groq API & Engine Settings</h2>
              <p className="text-xs text-slate-500">Provide your Groq key for ultra-fast RAG inference</p>
            </div>
          </div>
          <button
            id="close-api-modal-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* API Key Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="groq-api-key-input" className="text-sm font-medium text-slate-800">
                Groq API Key
              </label>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 underline"
              >
                Get a free key <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="relative">
              <input
                id="groq-api-key-input"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setValidationStatus('idle');
                  setErrorMessage('');
                }}
                placeholder={hasServerKey ? 'Environment GROQ_API_KEY detected (optional override)' : 'gsk_...'}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 transition-colors"
              />
            </div>

            {hasServerKey && !apiKey && (
              <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Server environment key is configured. You can leave this blank or override.
              </p>
            )}

            {/* Test Connection Button & Status */}
            <div className="flex items-center justify-between pt-1">
              <button
                id="test-groq-key-btn"
                type="button"
                onClick={handleTestKey}
                disabled={isValidating || (!apiKey.trim() && !hasServerKey)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isValidating ? 'animate-spin text-orange-600' : ''}`} />
                {isValidating ? 'Testing...' : 'Test Connection'}
              </button>

              {validationStatus === 'valid' && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Connected successfully
                </span>
              )}
              {validationStatus === 'invalid' && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600">
                  <AlertCircle className="h-4 w-4" /> Key verification failed
                </span>
              )}
            </div>

            {errorMessage && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2.5">
                {errorMessage}
              </p>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-orange-600" />
              Groq LLM Model
            </label>
            <div className="grid grid-cols-1 gap-2">
              {GROQ_MODELS.map((item) => (
                <button
                  key={item.id}
                  id={`model-opt-${item.id}`}
                  type="button"
                  onClick={() => setModel(item.id)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    model === item.id
                      ? 'border-orange-500 bg-orange-50/50 ring-1 ring-orange-400'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-semibold text-slate-900">{item.name}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        model === item.id
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* RAG Retrieval Sensitivity */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-orange-600" />
                Retrieved Passages (Top-K)
              </label>
              <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                {topK} Chunks
              </span>
            </div>
            <input
              id="top-k-slider"
              type="range"
              min="2"
              max="8"
              step="1"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full accent-orange-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>2 (Focused)</span>
              <span>5 (Balanced)</span>
              <span>8 (Comprehensive)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50">
          <button
            id="cancel-settings-btn"
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            Cancel
          </button>
          <button
            id="save-settings-btn"
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-orange-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition-colors cursor-pointer"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
