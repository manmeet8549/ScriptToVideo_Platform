import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sparkles, Calendar, Plus, Trash2, Loader2, Info, CheckCircle2, ChevronRight, Copy, Check
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface PlanItem {
  id: string;
  topic: string;
  hook: string;
  scriptIdea: string;
  publishingDate: string;
  status: string;
}

interface TemplateItem {
  id: string;
  name: string;
  prompt: string;
  frequency: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  timeOfDay: string;
  active: boolean;
}

export default function AIPlannerSection() {
  const [activeTab, setActiveTab] = useState<'planner' | 'assistant' | 'recurring'>('planner');

  // AI Planner States
  const [niche, setNiche] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [frequency, setFrequency] = useState('3 Posts Per Week');
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [savingCalendar, setSavingCalendar] = useState(false);

  // AI Content Assistant States
  const [assistantPlatform, setAssistantPlatform] = useState('youtube');
  const [assistantTopic, setAssistantTopic] = useState('');
  const [assistantScript, setAssistantScript] = useState('');
  const [generatingAssistant, setGeneratingAssistant] = useState(false);
  const [assistantOutput, setAssistantOutput] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Recurring Template States
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templatePrompt, setTemplatePrompt] = useState('');
  const [templateFreq, setTemplateFreq] = useState('WEEKLY');
  const [templateDayOfWeek, setTemplateDayOfWeek] = useState('1'); // Monday
  const [templateDayOfMonth, setTemplateDayOfMonth] = useState('1');
  const [templateTime, setTemplateTime] = useState('09:00');
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  // Custom Content Suggestions State
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Fetch Recurring Templates
  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/recurring');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Fetch Suggestions
  const handleLoadSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch('/api/planner/suggestions');
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Generate 30-Day Plan
  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingPlan(true);
    try {
      const res = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, targetAudience, frequency })
      });
      const data = await res.json();
      if (res.ok) {
        setPlanItems(data.items || []);
        alert('AI Plan Generated! You can review details below.');
      } else {
        alert(data.error || 'Failed to generate plan');
      }
    } catch (err) {
      console.error(err);
      alert('Error generating plan');
    } finally {
      setGeneratingPlan(false);
    }
  };

  // Generate Assistant Copy
  const handleGenerateAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingAssistant(true);
    setAssistantOutput(null);
    try {
      const res = await fetch('/api/assistant/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: assistantPlatform, topic: assistantTopic, scriptText: assistantScript })
      });
      const data = await res.json();
      if (res.ok) {
        setAssistantOutput(data);
      } else {
        alert(data.error || 'Failed to generate copy');
      }
    } catch (err) {
      console.error(err);
      alert('Error generating copy');
    } finally {
      setGeneratingAssistant(false);
    }
  };

  // Create Recurring Template
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingTemplate(true);
    try {
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          prompt: templatePrompt,
          frequency: templateFreq,
          dayOfWeek: templateFreq === 'WEEKLY' ? templateDayOfWeek : undefined,
          dayOfMonth: templateFreq === 'MONTHLY' ? templateDayOfMonth : undefined,
          timeOfDay: templateTime,
        })
      });
      if (res.ok) {
        alert('Recurring template created!');
        setTemplateName('');
        setTemplatePrompt('');
        fetchTemplates();
      } else {
        alert('Failed to create template.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleToggleTemplate = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/recurring', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !currentActive })
      });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      const res = await fetch(`/api/recurring?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Copy helper
  const handleCopyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-1">
      {/* Title Header */}
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-black flex items-center gap-3">
            AI Content Planner
          </h1>
          <p className="text-sm text-gray-500 font-sans mt-1">
            Leverage NVIDIA NIM Llama models to create 30-day outline campaigns, recurring templates, and copy.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex border border-gray-150 rounded-xl overflow-hidden shadow-2xs bg-white text-xs font-bold">
          <button
            onClick={() => setActiveTab('planner')}
            className={`px-4 py-2 transition-all cursor-pointer border-r border-gray-150 ${activeTab === 'planner' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:text-black hover:bg-neutral-50'}`}
          >
            30-Day Planner
          </button>
          <button
            onClick={() => setActiveTab('assistant')}
            className={`px-4 py-2 transition-all cursor-pointer border-r border-gray-150 ${activeTab === 'assistant' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:text-black hover:bg-neutral-50'}`}
          >
            AI Assistant
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`px-4 py-2 transition-all cursor-pointer ${activeTab === 'recurring' ? 'bg-black text-white' : 'bg-white text-gray-500 hover:text-black hover:bg-neutral-50'}`}
          >
            Automation Templates
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Planner Tab */}
        {activeTab === 'planner' && (
          <>
            {/* Strategy Input Form */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <CardContent className="p-0 space-y-6">
                  <h3 className="font-extrabold text-lg text-black font-sans leading-tight border-b pb-3">Strategy Builder</h3>
                  <form onSubmit={handleGeneratePlan} className="space-y-4 text-xs font-sans">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Content Niche</label>
                      <input
                        type="text"
                        placeholder="e.g. AI Tools, Real Estate, Cooking, Coding"
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2.5 font-semibold text-gray-700 focus:ring-1 focus:ring-black focus:outline-hidden"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Target Audience</label>
                      <input
                        type="text"
                        placeholder="e.g. Marketing Agencies, Home Buyers, Beginners"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2.5 font-semibold text-gray-700 focus:ring-1 focus:ring-black focus:outline-hidden"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Post Frequency</label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2.5 font-semibold text-gray-700 cursor-pointer focus:ring-1 focus:ring-black"
                      >
                        <option value="Weekly (4 posts)">1 Post Per Week (4 posts/mo)</option>
                        <option value="3 Posts Per Week (12 posts)">3 Posts Per Week (12 posts/mo)</option>
                        <option value="5 Posts Per Week (20 posts)">5 Posts Per Week (20 posts/mo)</option>
                        <option value="Daily (30 posts)">Daily Posting (30 posts/mo)</option>
                      </select>
                    </div>
                    <Button
                      type="submit"
                      disabled={generatingPlan}
                      className="w-full rounded-xl bg-black text-white hover:bg-neutral-800 py-3 font-bold cursor-pointer flex justify-center items-center gap-1.5 shadow-xs"
                    >
                      {generatingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Generate 30-Day Content Strategy
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Suggestions Panel */}
              <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="font-extrabold text-sm text-black font-sans">Recent Content Recommendations</h3>
                  <button
                    onClick={handleLoadSuggestions}
                    disabled={loadingSuggestions}
                    className="text-[10px] font-extrabold text-indigo-600 hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {loadingSuggestions ? 'Loading...' : 'Get Ideas'}
                  </button>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1 scrollbar-thin text-xs">
                  {suggestions.length > 0 ? (
                    suggestions.map((s, idx) => (
                      <div key={idx} className="p-3 bg-neutral-50 border border-gray-100 rounded-2xl space-y-1">
                        <p className="font-bold text-black">{s.topic}</p>
                        <p className="text-[10px] text-gray-500 italic">Hook: "{s.hook}"</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-gray-400 font-semibold text-center py-4">Click "Get Ideas" to analyze history and load suggestions.</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Generated Plan Output List */}
            <div className="lg:col-span-7">
              <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm h-full">
                <CardContent className="p-0 space-y-4 flex flex-col h-full">
                  <h3 className="font-extrabold text-lg text-black font-sans border-b pb-3 flex items-center justify-between">
                    <span>Generated Strategy Roadmap</span>
                    {planItems.length > 0 && (
                      <span className="text-xs font-bold text-neutral-400">{planItems.length} publications planned</span>
                    )}
                  </h3>

                  <div className="flex-1 overflow-y-auto max-h-[500px] space-y-4 pr-1 scrollbar-thin text-xs">
                    {planItems.length > 0 ? (
                      planItems.map((item, idx) => (
                        <div key={item.id || idx} className="p-4 border border-gray-150 rounded-2xl space-y-2 hover:border-black/35 transition-all">
                          <div className="flex justify-between items-center">
                            <span className="bg-neutral-100 text-black border border-gray-200 px-2 py-0.5 rounded-md font-black">Day {new Date(item.publishingDate).getDate() - new Date().getDate()}</span>
                            <span className="text-[10px] font-bold text-gray-400">{new Date(item.publishingDate).toLocaleDateString()}</span>
                          </div>
                          <h4 className="font-extrabold text-black text-sm">{item.topic}</h4>
                          <p className="text-gray-600 bg-neutral-50/50 p-2 border rounded-xl italic">Hook: "{item.hook}"</p>
                          <div className="text-[11px] text-gray-500 font-medium">
                            <span className="font-bold block text-black mb-1">Outline:</span>
                            {item.scriptIdea.split('\n').map((line, lIdx) => (
                              <p key={lIdx} className="pl-2 border-l-2 border-gray-100 mt-0.5">{line}</p>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-24 text-center border border-dashed border-gray-150 rounded-2xl bg-neutral-50/20">
                        <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-xs font-semibold text-gray-400">Your generated strategy roadmap will appear here.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* AI Assistant Tab */}
        {activeTab === 'assistant' && (
          <>
            {/* Input fields */}
            <div className="lg:col-span-5">
              <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <CardContent className="p-0 space-y-6">
                  <h3 className="font-extrabold text-lg text-black font-sans border-b pb-3">Copy Generator</h3>
                  <form onSubmit={handleGenerateAssistant} className="space-y-4 text-xs font-sans">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Target Platform</label>
                      <select
                        value={assistantPlatform}
                        onChange={(e) => setAssistantPlatform(e.target.value)}
                        className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2.5 font-semibold text-gray-700 cursor-pointer"
                      >
                        <option value="youtube">YouTube Video</option>
                        <option value="linkedin">LinkedIn Post</option>
                        <option value="facebook">Facebook Caption</option>
                        <option value="instagram">Instagram Reel</option>
                        <option value="twitter">X (Twitter) Tweet</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Video Topic / Concept</label>
                      <input
                        type="text"
                        placeholder="e.g. NVIDIA NIM integrations, 10 coding tips"
                        value={assistantTopic}
                        onChange={(e) => setAssistantTopic(e.target.value)}
                        className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2.5 font-semibold text-gray-700"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Video Script (Optional)</label>
                      <textarea
                        rows={4}
                        placeholder="Paste script text to generate hyper-contextual copy..."
                        value={assistantScript}
                        onChange={(e) => setAssistantScript(e.target.value)}
                        className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2 font-semibold text-gray-700"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={generatingAssistant}
                      className="w-full rounded-xl bg-black text-white hover:bg-neutral-800 py-3 font-bold cursor-pointer flex justify-center items-center gap-1.5 shadow-xs"
                    >
                      {generatingAssistant ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Generate Platform Copy
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Generated copy card */}
            <div className="lg:col-span-7">
              <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm h-full flex flex-col">
                <h3 className="font-extrabold text-lg text-black font-sans border-b pb-3">AI Recommendations Output</h3>
                <div className="flex-1 space-y-6 mt-4 text-xs font-sans">
                  {assistantOutput ? (
                    <div className="space-y-5">
                      {/* Title */}
                      <div className="p-4 bg-neutral-50 rounded-2xl space-y-1.5 relative border">
                        <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Optimized Title</span>
                        <p className="font-extrabold text-black text-sm pr-8">{assistantOutput.title}</p>
                        <button
                          onClick={() => handleCopyToClipboard(assistantOutput.title, 'title')}
                          className="absolute top-4 right-4 text-neutral-400 hover:text-black cursor-pointer"
                        >
                          {copiedField === 'title' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Description */}
                      <div className="p-4 bg-neutral-50 rounded-2xl space-y-1.5 relative border">
                        <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Post Body / Caption</span>
                        <p className="text-gray-700 pr-8 whitespace-pre-wrap">{assistantOutput.description}</p>
                        <button
                          onClick={() => handleCopyToClipboard(assistantOutput.description, 'description')}
                          className="absolute top-4 right-4 text-neutral-400 hover:text-black cursor-pointer"
                        >
                          {copiedField === 'description' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Hashtags */}
                      <div className="p-4 bg-neutral-50 rounded-2xl space-y-1.5 relative border">
                        <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Hashtags</span>
                        <p className="font-mono text-indigo-600 font-bold pr-8">
                          {assistantOutput.hashtags.map((h: string) => `#${h}`).join(' ')}
                        </p>
                        <button
                          onClick={() => handleCopyToClipboard(assistantOutput.hashtags.map((h: string) => `#${h}`).join(' '), 'tags')}
                          className="absolute top-4 right-4 text-neutral-400 hover:text-black cursor-pointer"
                        >
                          {copiedField === 'tags' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Call to Action */}
                      <div className="p-4 bg-neutral-50 rounded-2xl space-y-1.5 relative border">
                        <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Call To Action (CTA)</span>
                        <p className="font-bold text-black pr-8">{assistantOutput.cta}</p>
                        <button
                          onClick={() => handleCopyToClipboard(assistantOutput.cta, 'cta')}
                          className="absolute top-4 right-4 text-neutral-400 hover:text-black cursor-pointer"
                        >
                          {copiedField === 'cta' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-24 text-center border border-dashed border-gray-150 rounded-2xl bg-neutral-50/20">
                      <Sparkles className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-xs font-semibold text-gray-400">Configure parameters and hit generate to populate AI recommendations.</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </>
        )}

        {/* Automation Templates Tab */}
        {activeTab === 'recurring' && (
          <>
            {/* Create Template */}
            <div className="lg:col-span-5">
              <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <CardContent className="p-0 space-y-6">
                  <h3 className="font-extrabold text-lg text-black font-sans border-b pb-3">New Automated Generator</h3>
                  <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs font-sans">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Automation Rule Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Weekly Tech News, Daily Strategy"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2.5 font-semibold text-gray-700"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Generation Prompt Template</label>
                      <textarea
                        rows={3}
                        placeholder="Write a custom script prompt (e.g. Write a script summarizing today's top artificial intelligence news)..."
                        value={templatePrompt}
                        onChange={(e) => setTemplatePrompt(e.target.value)}
                        className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2 font-semibold text-gray-700"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Frequency</label>
                      <select
                        value={templateFreq}
                        onChange={(e) => setTemplateFreq(e.target.value)}
                        className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2.5 font-semibold text-gray-700 cursor-pointer"
                      >
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                    </div>

                    {templateFreq === 'WEEKLY' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Day of Week</label>
                        <select
                          value={templateDayOfWeek}
                          onChange={(e) => setTemplateDayOfWeek(e.target.value)}
                          className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2.5 font-semibold text-gray-700 cursor-pointer"
                        >
                          <option value="0">Sunday</option>
                          <option value="1">Monday</option>
                          <option value="2">Tuesday</option>
                          <option value="3">Wednesday</option>
                          <option value="4">Thursday</option>
                          <option value="5">Friday</option>
                          <option value="6">Saturday</option>
                        </select>
                      </div>
                    )}

                    {templateFreq === 'MONTHLY' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Day of Month</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={templateDayOfMonth}
                          onChange={(e) => setTemplateDayOfMonth(e.target.value)}
                          className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2 font-semibold text-gray-700"
                          required
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Trigger Time</label>
                      <input
                        type="time"
                        value={templateTime}
                        onChange={(e) => setTemplateTime(e.target.value)}
                        className="w-full bg-white border border-gray-150 rounded-xl px-3 py-2 font-semibold text-gray-700"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={creatingTemplate}
                      className="w-full rounded-xl bg-black text-white hover:bg-neutral-800 py-3 font-bold cursor-pointer flex justify-center items-center gap-1.5 shadow-xs"
                    >
                      {creatingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Add Automation Template
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* List Templates */}
            <div className="lg:col-span-7">
              <Card className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm h-full">
                <CardContent className="p-0 space-y-4">
                  <h3 className="font-extrabold text-lg text-black font-sans border-b pb-3">Active Generation Templates</h3>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin text-xs">
                    {templates.length > 0 ? (
                      templates.map((tpl) => (
                        <div key={tpl.id} className="p-4 border rounded-2xl flex justify-between items-start hover:border-gray-300 transition-all bg-white">
                          <div className="space-y-2 max-w-[80%]">
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-black text-sm">{tpl.name}</h4>
                              <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">{tpl.frequency}</span>
                            </div>
                            <p className="text-gray-500 italic">Prompt: "{tpl.prompt}"</p>
                            <p className="text-[10px] text-gray-400 font-semibold">
                              Scheduled: {tpl.frequency === 'WEEKLY' ? `Every Week (Day ${tpl.dayOfWeek})` : tpl.frequency === 'MONTHLY' ? `Every Month (Day ${tpl.dayOfMonth})` : 'Every Day'} at {tpl.timeOfDay}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Toggle toggle switch style button */}
                            <button
                              onClick={() => handleToggleTemplate(tpl.id, tpl.active)}
                              className={`px-3 py-1 rounded-xl font-bold cursor-pointer border ${tpl.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-neutral-50 text-neutral-400 border-neutral-200'}`}
                            >
                              {tpl.active ? 'Active' : 'Paused'}
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(tpl.id)}
                              className="text-red-500 hover:text-red-700 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-24 text-center border border-dashed border-gray-150 rounded-2xl bg-neutral-50/20">
                        <Sparkles className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-xs font-semibold text-gray-400">Configure recurring generators to automate video creation pipelines.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
