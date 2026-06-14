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
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // --- Title ---
      doc.fontSize(20).text("AI Lead Investigation Report", { align: "center" });
      doc.moveDown();

      // --- Lead Overview ---
      doc.fontSize(16).text("Lead Overview", { underline: true });
      doc.fontSize(12);
      doc.text(`Lead Name: ${formData.name || "N/A"}`);
      doc.text(`Company Name: ${formData.companyName || formData.company || "N/A"}`);
      if (formData.role) doc.text(`Industry/Role: ${formData.role}`);
      if (formData.email) doc.text(`Email Address: ${formData.email}`);
      if (formData.mobile) doc.text(`Mobile Number: ${formData.mobile}`);
      if (formData.companyUrl) doc.text(`Company URL: ${formData.companyUrl}`);
      if (formData.budget) doc.text(`Budget: ${formData.budget}`);
      if (formData.requirement) doc.text(`Requirement: ${formData.requirement}`);
      doc.moveDown();

      if (results) {
        // --- Business Analysis & Scoring ---
        if (results.businessAnalysis) {
          doc.fontSize(16).text("Business Analysis & Scoring", { underline: true });
          doc.fontSize(12);
          doc.text(`Alignment Score: ${results.businessAnalysis.alignmentScore} / 50`);
          doc.text(`Recommendation: ${results.businessAnalysis.recommendation}`);
          doc.moveDown();
          doc.text("Executive Summary:");
          doc.text(results.businessAnalysis.requirementAnalysis);
          doc.moveDown();
          
          if (results.businessAnalysis.scoreAttributes) {
             doc.text("Scoring Attributes:");
             results.businessAnalysis.scoreAttributes.forEach(item => {
                doc.text(`- [${item.category}] ${item.factor}: ${item.contribution}`);
             });
             doc.moveDown();
          }

          if (results.businessAnalysis.potentialRisks && results.businessAnalysis.potentialRisks.length > 0) {
            doc.fillColor("red").text("Potential Risks:");
            results.businessAnalysis.potentialRisks.forEach(risk => {
              doc.text(`- ${risk}`);
            });
            doc.fillColor("black").moveDown();
          }
        }

        // --- Company Profile ---
        if (results.companyProfile) {
          doc.addPage();
          doc.fontSize(16).text("Company Profile", { underline: true });
          doc.fontSize(12);
          doc.text(`Company Name: ${results.companyProfile.companyName || "N/A"}`);
          doc.text(`Industry: ${results.companyProfile.industry || "N/A"}`);
          doc.text(`Employee Count: ${results.companyProfile.employeeCount || "N/A"}`);
          doc.text(`Headquarters: ${results.companyProfile.headquarters || "N/A"}`);
          doc.moveDown();
          if (results.companyProfile.description) {
            doc.text("Description:");
            doc.text(results.companyProfile.description);
          }
        }

        // --- Core Requirement ---
        if (results.companyCoreRequirement) {
          doc.addPage();
          doc.fontSize(16).text("Company Core Requirement", { underline: true });
          doc.fontSize(12);
          if (results.companyCoreRequirement.coreProducts) {
             doc.text(`Core Products: ${results.companyCoreRequirement.coreProducts.join(", ")}`);
          }
          doc.moveDown();
          doc.text("Key Offerings & Model:");
          doc.text(results.companyCoreRequirement.keyOfferings || "N/A");
          doc.moveDown();
          doc.text("Presentation Insights:");
          doc.text(results.companyCoreRequirement.businessPresentation || "N/A");
        }
      }

      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
