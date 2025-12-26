Office.onReady((info) => {
    if (info.host === Office.HostType.Outlook) {
        document.getElementById("analyze-btn").onclick = analyzeDeal;
        document.getElementById("create-app-btn").onclick = createApplication;
        document.getElementById("draft-reply-btn").onclick = draftReply;
    }
});

async function analyzeDeal() {
    const item = Office.context.mailbox.item;
    const content = document.getElementById("analysis-content");

    content.innerHTML = `
        <div class="skeleton" style="width: 100%"></div>
        <div class="skeleton" style="width: 80%"></div>
        <div class="skeleton" style="width: 60%"></div>
        <div style="font-size: 11px; color: #999; margin-top: 8px;">SCANNING ATTACHMENTS...</div>
    `;

    // 1. Get Email Body
    item.body.getAsync(Office.CoercionType.Text, async (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
            const emailBody = result.value;
            const sender = item.from.emailAddress;
            const subject = item.subject;

            // 2. Get Attachments
            const attachments = item.attachments;
            const formData = new FormData();
            formData.append("subject", subject);
            formData.append("sender", sender);
            formData.append("body", emailBody);

            if (attachments.length > 0) {
                content.innerHTML += `<br/>Found ${attachments.length} attachments. Downloading...`;

                // Process attachments sequentially
                for (let i = 0; i < attachments.length; i++) {
                    const att = attachments[i];
                    if (att.attachmentType === Office.MailboxEnums.AttachmentType.File) {
                        try {
                            const fileContent = await getAttachmentContent(att.id);
                            // Convert base64 to Blob
                            const blob = base64ToBlob(fileContent, att.contentType);
                            formData.append("attachments", blob, att.name);
                        } catch (e) {
                            console.error("Error fetching attachment " + att.name, e);
                        }
                    }
                }
            }

            try {
                content.innerHTML = "Analyzing Deal Data...";
                // Use Cloud Run URL
                const response = await fetch("https://brain-service-952649324958.us-central1.run.app/api/v1/m365/analyze_deal", {
                    method: "POST",
                    body: formData // Send as FormData
                });

                const data = await response.json();

                // Render Findings
                let html = "<div class='findings-list'>";
                data.findings.forEach(finding => {
                    const icon = finding.includes("✅") ? "check_circle" : finding.includes("❌") ? "cancel" : "info";
                    // Strip emoji for cleaner look if desired, or keep them. Let's keep them for now but style them.
                    html += `<div class='finding-item'>${finding}</div>`;
                });
                html += "</div>";

                // Render Extracted Data (Data Grid)
                if (data.extracted_data) {
                    html += "<div class='data-grid' style='margin-top: 16px;'>";
                    if (data.extracted_data.amount) {
                        html += `<div class='data-row'><span class='data-label'>LOAN AMOUNT</span><span class='data-value'>${data.extracted_data.amount}</span></div>`;
                    }
                    if (data.extracted_data.dscr) {
                        html += `<div class='data-row'><span class='data-label'>EST. DSCR</span><span class='data-value'>${data.extracted_data.dscr}</span></div>`;
                    }
                    if (data.extracted_data.has_tax_returns) {
                        html += `<div class='data-row'><span class='data-label'>TAX RETURNS</span><span class='data-value text-success'>DETECTED</span></div>`;
                    }
                    html += "</div>";
                }

                content.innerHTML = html;

                // Show Actions
                document.getElementById("actions-section").classList.remove("hidden");

                // Set Badge
                const badge = document.getElementById("deal-score-badge");
                if (data.is_eligible) {
                    badge.className = "text-success";
                    badge.innerText = `● ELIGIBLE (SCORE: ${data.score})`;
                } else {
                    badge.className = "text-error";
                    badge.innerText = `● INELIGIBLE (SCORE: ${data.score})`;
                }

            } catch (error) {
                content.innerHTML = "Error connecting to Brain: " + error.message;
            }
        }
    });
}

function getAttachmentContent(attachmentId) {
    return new Promise((resolve, reject) => {
        Office.context.mailbox.item.getAttachmentContentAsync(attachmentId, (result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
                resolve(result.value.content);
            } else {
                reject(result.error);
            }
        });
    });
}

function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

function draftReply() {
    // Call backend to draft reply
    console.log("Drafting reply...");
}

async function createApplication() {
    // Call backend to create app
    alert("Creating Application in Console...");
}
