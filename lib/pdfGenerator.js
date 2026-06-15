const PDFDocument = require("pdfkit");

/**
 * Generates a PDF report from the AI investigation results.
 * @param {Object} formData - The lead details (name, companyName, etc.)
 * @param {Object} results - The enriched data from the AI agent
 * @returns {Promise<Buffer>} - The generated PDF as a buffer
 */
exports.generateLeadReportPDF = (formData, results) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Colors
      const colors = {
        primary: "#0d6efd",
        secondary: "#6c757d",
        success: "#198754",
        danger: "#dc3545",
        warning: "#ffc107",
        info: "#0dcaf0",
        dark: "#212529",
        light: "#f8f9fa",
        border: "#dee2e6",
        textMain: "#212529",
        textMuted: "#6c757d",
        white: "#ffffff"
      };

      // Helper function to handle page breaks
      const checkPageBreak = (heightNeeded) => {
        if (doc.y + heightNeeded > doc.page.height - doc.page.margins.bottom) {
          doc.addPage();
        }
      };

      // Draw Card Header with background color
      const drawCardHeader = (title, bgColor = colors.primary) => {
        checkPageBreak(50);
        doc.moveDown(1);
        
        // Draw Header Background
        const currentY = doc.y;
        doc.rect(40, currentY, doc.page.width - 80, 25).fill(bgColor);
        
        // Draw Header Text
        doc.fillColor(colors.white)
           .font("Helvetica-Bold")
           .fontSize(12)
           .text(title, 50, currentY + 7);
           
        doc.y = currentY + 25; // Move Y below header
        doc.moveDown(0.5);
      };

      // Helper function for key-value pairs
      const drawKeyValue = (key, value) => {
        if (!value) return;
        checkPageBreak(20);
        doc.font("Helvetica-Bold")
           .fontSize(10)
           .fillColor(colors.textMain)
           .text(`${key}: `, 50, doc.y, { continued: true })
           .font("Helvetica")
           .fillColor(colors.textMuted)
           .text(String(value));
        doc.moveDown(0.2);
      };

      // --- Title ---
      doc.font("Helvetica-Bold")
         .fontSize(22)
         .fillColor(colors.dark)
         .text("AI Lead Investigation Report", { align: "center" });
      doc.moveDown(1.5);

      // --- 1. Lead Information Overview ---
      drawCardHeader("Lead Information Overview", colors.dark);
      drawKeyValue("Lead Name", formData.name || "N/A");
      drawKeyValue("Company Name", formData.companyName || formData.company || "N/A");
      drawKeyValue("Industry/Role", formData.role);
      drawKeyValue("Email Address", formData.email);
      drawKeyValue("Mobile Number", formData.mobile);
      drawKeyValue("Company URL", formData.companyUrl);
      drawKeyValue("Budget", formData.budget || "400000");
      drawKeyValue("Requirement", formData.requirement || "N/A");
      doc.moveDown(1);

      if (results) {
        // --- 2. AI Lead Alignment Score ---
        if (results.businessAnalysis) {
          drawCardHeader("AI Lead Alignment Score", colors.dark);
          
          // Render Score in a rounded badge-like text
          checkPageBreak(40);
          doc.font("Helvetica-Bold").fontSize(12).fillColor(colors.textMain).text("Alignment Score: ", 50, doc.y, { continued: true });
          doc.font("Helvetica").fontSize(12).fillColor(colors.primary).text(`${results.businessAnalysis.alignmentScore} / 50`);
          doc.moveDown(0.5);

          drawKeyValue("Recommendation", results.businessAnalysis.recommendation);
          doc.moveDown(0.5);
          
          doc.font("Helvetica-Bold").fontSize(11).fillColor(colors.textMain).text("Scoring Breakdown:", 50, doc.y);
          doc.moveDown(0.3);
          doc.font("Helvetica").fontSize(10).fillColor(colors.textMuted);

          if (results.businessAnalysis.scoreAttributes) {
            results.businessAnalysis.scoreAttributes.forEach(item => {
              checkPageBreak(15);
              doc.text(`• [${item.category}] ${item.factor}: ${item.contribution}`, 60, doc.y);
            });
          } else if (results.businessAnalysis.scoringBreakdown) {
             if (results.businessAnalysis.scoringBreakdown.pointsEarned) {
                results.businessAnalysis.scoringBreakdown.pointsEarned.forEach(item => {
                   checkPageBreak(15);
                   doc.fillColor(colors.success).text(`• [Earned] ${item.point}: +${item.value}`, 60, doc.y);
                });
             }
             if (results.businessAnalysis.scoringBreakdown.pointsDeducted) {
                results.businessAnalysis.scoringBreakdown.pointsDeducted.forEach(item => {
                   checkPageBreak(15);
                   doc.fillColor(colors.danger).text(`• [Deducted] ${item.point}: -${item.value}`, 60, doc.y);
                });
             }
          }

          doc.moveDown(0.5);
          doc.font("Helvetica-Bold").fontSize(11).fillColor(colors.textMain).text("Executive Summary:", 50, doc.y);
          doc.font("Helvetica").fontSize(10).fillColor(colors.textMuted).text(results.businessAnalysis.requirementAnalysis || "N/A", 50, doc.y);
          doc.moveDown(1);
        }

        // --- 3. Company's Core Requirement ---
        if (results.companyCoreRequirement) {
          drawCardHeader("Company's Core Requirement", colors.primary);
          
          if (results.companyCoreRequirement.coreProducts && results.companyCoreRequirement.coreProducts.length > 0) {
            checkPageBreak(30);
            doc.font("Helvetica-Bold").fontSize(11).fillColor(colors.textMain).text("Core Business Products:", 50, doc.y);
            // Draw pseudo badges
            doc.font("Helvetica").fontSize(10).fillColor(colors.primary).text(results.companyCoreRequirement.coreProducts.join(" | "), 50, doc.y);
            doc.moveDown(0.5);
          }
          
          checkPageBreak(30);
          doc.font("Helvetica-Bold").fontSize(11).fillColor(colors.textMain).text("Key Offerings & Model:", 50, doc.y);
          doc.font("Helvetica").fontSize(10).fillColor(colors.textMuted).text(results.companyCoreRequirement.keyOfferings || "N/A", 50, doc.y);
          doc.moveDown(0.5);
          
          checkPageBreak(30);
          doc.font("Helvetica-Bold").fontSize(11).fillColor(colors.textMain).text("Presentation Insights:", 50, doc.y);
          doc.font("Helvetica").fontSize(10).fillColor(colors.textMuted).text(results.companyCoreRequirement.businessPresentation || "N/A", 50, doc.y);
          doc.moveDown(1);
        }

        // --- 4. Potential Sales Risks & Red Flags ---
        if (results.businessAnalysis && results.businessAnalysis.potentialRisks && results.businessAnalysis.potentialRisks.length > 0) {
          drawCardHeader("Potential Sales Risks & Red Flags", colors.danger);

          doc.font("Helvetica").fontSize(10).fillColor(colors.danger);
          results.businessAnalysis.potentialRisks.forEach(risk => {
            checkPageBreak(15);
            doc.text(`• ${risk}`, 50, doc.y);
          });
          doc.moveDown(1);
        }

        // --- 5. Financial & Strategic Roadmap ---
        if (results.financialAudit) {
          drawCardHeader("Financial & Strategic Roadmap", colors.secondary);
          
          if (results.financialAudit.companyStatus) {
            drawKeyValue("Company Status", results.financialAudit.companyStatus);
            doc.moveDown(0.5);
          }
          
          checkPageBreak(30);
          doc.font("Helvetica-Bold").fontSize(11).fillColor(colors.textMain).text("Financial Summary & Status:", 50, doc.y);
          doc.font("Helvetica").fontSize(10).fillColor(colors.textMuted).text(results.financialAudit.financialSummary || "N/A", 50, doc.y);
          
          if (results.financialAudit.listingDetails) {
             doc.moveDown(0.3);
             doc.font("Courier").fontSize(9).fillColor(colors.secondary).text(`Listing Details: ${results.financialAudit.listingDetails}`, 50, doc.y);
          }
          doc.moveDown(0.5);
          
          checkPageBreak(30);
          doc.font("Helvetica-Bold").fontSize(11).fillColor(colors.textMain).text("Future Plans (Next Year Roadmap):", 50, doc.y);
          doc.font("Helvetica").fontSize(10).fillColor(colors.textMuted).text(results.financialAudit.futurePlans || "N/A", 50, doc.y);
          doc.moveDown(0.5);
          
          checkPageBreak(30);
          doc.font("Helvetica-Bold").fontSize(11).fillColor(colors.textMain).text("Requirement Strategic Match Analysis:", 50, doc.y);
          const isAligned = results.financialAudit.requirementMatch && (results.financialAudit.requirementMatch.toLowerCase().includes("yes") || results.financialAudit.requirementMatch.toLowerCase().includes("aligned"));
          doc.font("Helvetica").fontSize(10).fillColor(isAligned ? colors.success : colors.warning).text(results.financialAudit.requirementMatch || "N/A", 50, doc.y);
          doc.moveDown(1);
        }

        // --- 6. Company Profile ---
        if (results.companyProfile && Object.keys(results.companyProfile).length > 0) {
          drawCardHeader("Company Profile", colors.success);
          
          drawKeyValue("Company Name", results.companyProfile.companyName || "N/A");
          drawKeyValue("Industry", results.companyProfile.industry || "N/A");
          drawKeyValue("Company Type", results.companyProfile.companyType || "N/A");
          drawKeyValue("Company Size", results.companyProfile.companySize || "N/A");
          drawKeyValue("Employee Count", results.companyProfile.employeeCount || "N/A");
          drawKeyValue("Headquarters", results.companyProfile.headquarters || "N/A");
          drawKeyValue("Founded", results.companyProfile.founded || "N/A");
          drawKeyValue("Revenue", results.companyProfile.revenue || "N/A");
          
          if (results.companyProfile.description) {
            doc.moveDown(0.5);
            checkPageBreak(30);
            doc.font("Helvetica-Bold").fontSize(10).fillColor(colors.textMain).text("Company Description:", 50, doc.y);
            doc.font("Helvetica").fontSize(10).fillColor(colors.textMuted).text(results.companyProfile.description, 50, doc.y);
          }

          if (results.companyProfile.funding) {
             doc.moveDown(0.5);
             checkPageBreak(30);
             doc.font("Helvetica-Bold").fontSize(10).fillColor(colors.textMain).text("Funding Information:", 50, doc.y);
             doc.font("Helvetica").fontSize(10).fillColor(colors.textMuted);
             if (results.companyProfile.funding.totalFunding) doc.text(`Total Funding: ${results.companyProfile.funding.totalFunding}`, 60, doc.y);
             if (results.companyProfile.funding.latestRound) doc.text(`Latest Round: ${results.companyProfile.funding.latestRound}`, 60, doc.y);
          }

          if (results.companyProfile.recentNews && results.companyProfile.recentNews.length > 0) {
            doc.moveDown(0.5);
            checkPageBreak(30);
            doc.font("Helvetica-Bold").fontSize(10).fillColor(colors.textMain).text("Recent News:", 50, doc.y);
            doc.font("Helvetica").fontSize(10).fillColor(colors.textMuted);
            results.companyProfile.recentNews.forEach(news => {
               checkPageBreak(15);
               doc.text(`• ${news}`, 60, doc.y);
            });
          }
          doc.moveDown(1);
        }

        // --- 7. Additional Information ---
        if (results.additionalInfo && Object.keys(results.additionalInfo).length > 0) {
          drawCardHeader("Additional Information", colors.info);
          Object.entries(results.additionalInfo).forEach(([key, value]) => {
            const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1");
            drawKeyValue(formattedKey, value);
          });
          doc.moveDown(1);
        }

        // --- 8. User Profile ---
        if (results.userProfile && Object.keys(results.userProfile).length > 0) {
          drawCardHeader("User Profile", colors.primary);
          
          if (results.userProfile.isFound === false) {
             checkPageBreak(30);
             doc.rect(50, doc.y, doc.page.width - 100, 20).fill("#fff3cd");
             doc.fillColor("#856404").font("Helvetica-Bold").fontSize(10).text("USER NOT FOUND: We could not find a verified profile for this name.", 60, doc.y - 14);
             doc.moveDown(1);
          } else if (results.userProfile.isCompanyMatch === false) {
             checkPageBreak(30);
             doc.rect(50, doc.y, doc.page.width - 100, 20).fill("#f8d7da");
             doc.fillColor("#721c24").font("Helvetica-Bold").fontSize(10).text(`Company Mismatch: ${results.userProfile.claimedCompanyMatchAnalysis || ""}`, 60, doc.y - 14);
             doc.moveDown(1);
          } else if (results.userProfile.claimedCompanyMatchAnalysis) {
             checkPageBreak(30);
             doc.rect(50, doc.y, doc.page.width - 100, 20).fill("#d1e7dd");
             doc.fillColor("#0f5132").font("Helvetica-Bold").fontSize(10).text(`Company Verified: ${results.userProfile.claimedCompanyMatchAnalysis}`, 60, doc.y - 14);
             doc.moveDown(1);
          }

          drawKeyValue("Full Name", results.userProfile.fullName || "N/A");
          drawKeyValue("Current Company", results.userProfile.currentCompany || "N/A");
          drawKeyValue("Current Role", results.userProfile.currentRole || "N/A");

          if (results.userProfile.summary) {
             doc.moveDown(0.5);
             checkPageBreak(30);
             doc.font("Helvetica-Bold").fontSize(10).fillColor(colors.textMain).text("Summary:", 50, doc.y);
             doc.font("Helvetica").fontSize(10).fillColor(colors.textMuted).text(results.userProfile.summary, 50, doc.y);
          }

          if (results.userProfile.experience && results.userProfile.experience.length > 0) {
             doc.moveDown(0.5);
             checkPageBreak(30);
             doc.font("Helvetica-Bold").fontSize(10).fillColor(colors.textMain).text("Experience:", 50, doc.y);
             doc.font("Helvetica").fontSize(10).fillColor(colors.textMuted);
             results.userProfile.experience.forEach(exp => {
                checkPageBreak(15);
                doc.text(`• ${exp.title} at ${exp.company} (${exp.duration})`, 60, doc.y);
             });
          }
          doc.moveDown(1);
        }
      }

      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
