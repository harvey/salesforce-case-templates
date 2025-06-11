(function () {
    // Prevent double injection
    if (document.getElementById('hcDropdown') || document.getElementById('autofillEmailBtn')) return;

    // ------------------------
    // Auto-Continue on Record Type Page
    // ------------------------

    autoContinue = false;

    if (autoContinue) {try {
        if (document.querySelector('label[for="p3"]') && document.getElementById('p3')) {
            const continueBtn = document.querySelector('input[name="save"][value="Continue"]');
            if (continueBtn) continueBtn.click();
            return;
        }
    } catch (e) {
        console.error('Auto-continue error:', e);
    }}

    // ------------------------------
    // Case Form Template Autofill
    // ------------------------------
    try {
        const targetSection = document.querySelector('.pbSubsection');
        if (!targetSection || !document.querySelector('.pbBody')) return;

        const IGNORED_FIELDS = ['cas3', 'cas4', '00N0J00000ALs8G'];
        let templates = JSON.parse(localStorage.getItem('caseTemplates')) || {};
        localStorage.setItem('caseTemplates', JSON.stringify(templates));

        // Create container for controls
        const container = document.createElement('div');
        container.style.cssText = 'padding:10px;background:#f3f2f2;border-bottom:1px solid #dddbda; display:flex; align-items:center; gap:8px; flex-wrap:wrap;';

        // Template dropdown
        const dropdown = document.createElement('select');
        dropdown.id = 'hcDropdown';
        dropdown.style.cssText = 'padding:8px;border-radius:4px;border:1px solid #dddbda;background:white;min-width:200px';

        // Utility to create a "fake button" span
        function makeBtn(text, bg, handler) {
            const span = document.createElement('span');
            span.textContent = text;
            span.style.cssText = `
                display:inline-block;
                padding:8px 12px;
                border-radius:4px;
                border:1px solid #dddbda;
                background:${bg};
                color:white;
                cursor:pointer;
                user-select:none;
            `;
            span.addEventListener('click', e => {
                e.preventDefault();
                handler();
            });
            return span;
        }

        const saveBtn   = makeBtn('Save Case Template',    '#0176d3', saveCurrentTemplate);
        const exportBtn = makeBtn('Export All Templates',  '#0176d3', exportTemplates);
        const importBtn = makeBtn('Import Templates',      '#0176d3', importTemplates);
        const deleteBtn = makeBtn('Delete Selected Template', '#0176d3', deleteTemplate);

        // --- ADD RIGHT-ANCHORED NAME REPLACER ---
        const nameInput = document.createElement('input');
        nameInput.id = 'hcNameInput';
        nameInput.type = 'text';
        nameInput.placeholder = 'Your Name';
        nameInput.style.cssText = `
            margin-left:auto;
            padding:8px;
            border-radius:4px;
            border:1px solid #dddbda;
            min-width:150px;
        `;

        const saveNamesBtn = makeBtn('Save Name to templates', '#28a745', () => {
            const newName = nameInput.value.trim();
            if (!newName) return alert('Please enter a name first.');
            Object.keys(templates).forEach(key => {
                const tpl = templates[key];
                tpl.fields['CF00N0J000009ye9b'] = newName;
            });
            localStorage.setItem('caseTemplates', JSON.stringify(templates));
            alert('All template contact names updated to "' + newName + '"');
        });
        // --- END ADDITIONS ---

        const nameSpan  = document.createElement('span');
        nameSpan.textContent = 'Harvey Chandler';
        nameSpan.style.cssText = 'font-weight:bold; margin-left:10px; text-decoration:underline; cursor:pointer; color:#0176d3';
        nameSpan.addEventListener('click', () => window.open('https://github.com/harvey', '_blank'));

        function refreshDropdown() {
            dropdown.innerHTML = '<option value="">-- Select Template --</option>';
            Object.entries(templates)
                .sort((a, b) => a[1].name.localeCompare(b[1].name))
                .forEach(([key, tpl]) => {
                    const opt = document.createElement('option');
                    opt.value = key;
                    opt.textContent = tpl.name;
                    dropdown.appendChild(opt);
                });
            const resetOpt = document.createElement('option');
            resetOpt.value = 'reset';
            resetOpt.textContent = 'Reset Form';
            dropdown.appendChild(resetOpt);
        }
        refreshDropdown();

        function setFieldValue(id, value) {
            if (IGNORED_FIELDS.includes(id)) return;
            const el = document.getElementById(id);
            if (!el) return;
            if (el.tagName === 'SELECT') {
                Array.from(el.options).forEach(opt => opt.selected = (opt.text === value || opt.value === value));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (el.type === 'checkbox') {
                el.checked = Boolean(value);
                el.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                el.value = value;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        function handleMultiSelect(id, values) {
            if (IGNORED_FIELDS.includes(id)) return;
            const select = document.getElementById(id);
            if (!select) return;
            Array.from(select.options).forEach(opt => opt.selected = values.includes(opt.value));
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }

        function applyTemplate(template) {
            // Ensure old notes are cleared so swapping templates updates correctly
            const notesEl = document.getElementById('cas16');
            if (notesEl) {
                notesEl.value = '';
                notesEl.dispatchEvent(new Event('input', { bubbles: true }));
                notesEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
            Object.entries(template.fields).forEach(([id, val]) => {
                Array.isArray(val) ? handleMultiSelect(id, val) : setFieldValue(id, val);
            });
        }

        function sendToBackground(array) {
            if (!Array.isArray(array)) {
                console.error('sendToBackground expects an array. Received:', array);
                return;
            }
            chrome.runtime.sendMessage({ action: 'SEND_ARRAY', payload: array }, response => {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message to background:', chrome.runtime.lastError);
                    return;
                }
                console.log('Content: Response from background:', response);
            });
        }

        function resetForm() {
            targetSection.querySelectorAll('select').forEach(sel => {
                if (IGNORED_FIELDS.includes(sel.id)) return;
                if (!sel.multiple) sel.selectedIndex = 0;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
            });
            targetSection.querySelectorAll('input').forEach(inp => {
                if (IGNORED_FIELDS.includes(inp.id)) return;
                if (['button', 'submit', 'hidden'].includes(inp.type)) return;
                if (inp.type === 'checkbox') inp.checked = false;
                else inp.value = '';
                inp.dispatchEvent(new Event('input', { bubbles: true }));
            });
            targetSection.querySelectorAll('textarea').forEach(ta => ta.value = '');
            setFieldValue('cas11', 'Phone');
        }

        function saveCurrentTemplate() {
            const name = prompt('Enter template name:');
            if (!name) return;
            const key = name.toLowerCase();
            const isOverwrite = !!templates[key];

            // Ask if include case notes (cas16)
            const includeNotes = confirm('Save case notes ("Case Details") in template?');

            if (isOverwrite && !confirm(`Overwrite existing template "${templates[key].name}"?`)) return;

            const fields = {};
            targetSection.querySelectorAll('select, input, textarea').forEach(el => {
                if (IGNORED_FIELDS.includes(el.id)) return;
                // if (el.id === 'cas16' && !includeNotes) return;
                if(includeNotes) {
                    cas16 = document.getElementById('cas16').value;
                    fields['cas16'] = cas16;
                }
                if (['button', 'submit', 'hidden'].includes(el.type)) return;
                if (el.tagName === 'SELECT') fields[el.id] = el.options[el.selectedIndex]?.text || '';
                else if (el.type === 'checkbox') fields[el.id] = el.checked;
                else fields[el.id] = el.value;
            });

            templates[key] = { name, fields };
            localStorage.setItem('caseTemplates', JSON.stringify(templates));
            refreshDropdown();
        }

        function exportTemplates() {
            const blob = new Blob([JSON.stringify(templates, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'case-templates.json';
            a.click();
            URL.revokeObjectURL(url);
        }

        function importTemplates() {
            const proceed = confirm(
              "WARNING: This will clear your other templates, and replace with the new templates. Do you wish to proceed?"
            );
            if (!proceed) return;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = e => {
                const reader = new FileReader();
                reader.onload = ev => {
                    try {
                        const imported = JSON.parse(ev.target.result);
                        templates = {};
                        localStorage.setItem('caseTemplates', JSON.stringify(templates));
                        refreshDropdown();
                        templates = imported;
                        localStorage.setItem('caseTemplates', JSON.stringify(templates));
                        refreshDropdown();
                        alert('Templates imported successfully!');
                    } catch {
                        alert('Error importing templates: Invalid format');
                    }
                };
                reader.readAsText(e.target.files[0]);
            };
            input.click();
        }

        function deleteTemplate() {
            const key = dropdown.value;
            if (!key || key === 'reset') return;
            if (!confirm(`Delete template "${templates[key].name}"?`)) return;
            delete templates[key];
            localStorage.setItem('caseTemplates', JSON.stringify(templates));
            refreshDropdown();
        }

        dropdown.addEventListener('change', () => {
            if (dropdown.value === 'reset') resetForm();
            else if (templates[dropdown.value]) {
                applyTemplate(templates[dropdown.value]);
                sendToBackground([window.location.hostname]);
            }
        });

        const mainTitle = document.querySelector('.mainTitle');
        if (mainTitle?.textContent != 'Case Edit') return;

        // Assemble controls
        container.appendChild(dropdown);
        container.appendChild(saveBtn);
        container.appendChild(exportBtn);
        container.appendChild(importBtn);
        container.appendChild(deleteBtn);
        container.appendChild(nameSpan);
        container.appendChild(nameInput);
        container.appendChild(saveNamesBtn);

        const pageHeader = document.querySelector('.pbHeader');
        if (pageHeader) pageHeader.parentNode.insertBefore(container, pageHeader.nextSibling);

    } catch (e) {
        console.error('Case section injection error:', e);
    }
})();