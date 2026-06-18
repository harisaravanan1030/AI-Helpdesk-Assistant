// Your Claude API Key - replace with your actual key from console.anthropic.com
const API_KEY = 'your-api-key-here';

let tickets = [];
let ticketCounter = 1000;

function updateStats() {
  document.getElementById('stat-total').textContent = tickets.length;
  document.getElementById('stat-open').textContent = tickets.filter(t => t.status === 'open').length;
  document.getElementById('stat-inprogress').textContent = tickets.filter(t => t.status === 'inprogress').length;
  document.getElementById('stat-resolved').textContent = tickets.filter(t => t.status === 'resolved').length;
}

function renderTickets() {
  const list = document.getElementById('tickets-list');
  if (tickets.length === 0) {
    list.innerHTML = '<div class="empty-state">No tickets yet. Submit one above!</div>';
    return;
  }
  list.innerHTML = tickets.slice().reverse().map(t => `
    <div class="ticket-item">
      <span class="ticket-id">#${t.id}</span>
      <div class="ticket-info">
        <div class="ticket-title">${t.name}</div>
        <div class="ticket-meta">${t.category} · ${t.desc.slice(0, 60)}${t.desc.length > 60 ? '...' : ''}</div>
      </div>
      <span class="tag tag-${t.priority.toLowerCase()}" style="margin-right:6px;">${t.priority}</span>
      <button class="ticket-status status-${t.status}" onclick="cycleStatus(${t.id})">
        ${t.status === 'open' ? 'Open' : t.status === 'inprogress' ? 'In Progress' : 'Resolved'}
      </button>
    </div>
  `).join('');
}

function cycleStatus(id) {
  const t = tickets.find(x => x.id === id);
  if (!t) return;
  const cycle = { open: 'inprogress', inprogress: 'resolved', resolved: 'open' };
  t.status = cycle[t.status];
  renderTickets();
  updateStats();
}

async function submitTicket() {
  const name = document.getElementById('ticket-name').value.trim();
  const email = document.getElementById('ticket-email').value.trim();
  const desc = document.getElementById('ticket-desc').value.trim();

  if (!name || !desc) {
    alert('Please enter your name and describe the issue.');
    return;
  }

  const btn = document.getElementById('submit-btn');
  const resultBox = document.getElementById('ai-result');

  btn.disabled = true;
  btn.textContent = 'AI is analyzing...';
  resultBox.classList.remove('show');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-allow-browser': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are an IT support AI. Analyze this support ticket and respond ONLY with valid JSON, no markdown, no backticks.

Ticket: "${desc}"

Respond with this exact JSON structure:
{
  "category": "Hardware|Software|Network|Account|Other",
  "priority": "Low|Medium|High|Critical",
  "summary": "one line summary of the issue",
  "steps": ["step 1", "step 2", "step 3", "step 4"]
}`
        }]
      })
    });

    const data = await response.json();
    let text = data.content.map(i => i.text || '').join('');
    text = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(text);

    document.getElementById('ai-tags').innerHTML = `
      <span class="tag tag-cat">📂 ${result.category}</span>
      <span class="tag tag-${result.priority.toLowerCase()}">⚠️ ${result.priority} Priority</span>
    `;

    document.getElementById('ai-solution').textContent =
      `${result.summary}\n\nResolution Steps:\n${result.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

    resultBox.classList.add('show');

    ticketCounter++;
    tickets.push({
      id: ticketCounter,
      name,
      email,
      desc,
      category: result.category,
      priority: result.priority,
      status: 'open'
    });

    renderTickets();
    updateStats();

    document.getElementById('ticket-name').value = '';
    document.getElementById('ticket-email').value = '';
    document.getElementById('ticket-desc').value = '';

  } catch (err) {
    document.getElementById('ai-solution').textContent = 'Error analyzing ticket. Please try again.';
    document.getElementById('ai-tags').innerHTML = '';
    resultBox.classList.add('show');
  }

  btn.disabled = false;
  btn.textContent = '✨ Analyze with AI & Submit';
}