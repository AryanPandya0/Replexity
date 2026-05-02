import io
import csv
import traceback
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from backend.api.pipeline import get_cached_result
from backend.api.schemas import AnalysisResult
from fpdf import FPDF

router = APIRouter(tags=["export"])

@router.get("/results/{analysis_id}", response_model=AnalysisResult)
async def get_results(analysis_id: str):
    result = get_cached_result(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return result

@router.get("/results/{analysis_id}/file/{file_path:path}")
async def get_file_detail(analysis_id: str, file_path: str):
    result = get_cached_result(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    
    for f in result.files:
        if f.file_path == file_path:
            return f
    raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

@router.get("/export/{analysis_id}/json")
async def export_json(analysis_id: str):
    result = get_cached_result(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    content = result.model_dump_json(indent=2)
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=analysis_{analysis_id}.json"},
    )

@router.get("/export/{analysis_id}/csv")
async def export_csv(analysis_id: str):
    result = get_cached_result(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "File", "Language", "LOC", "Functions", "Classes",
        "Cyclomatic Complexity", "Cognitive Complexity", "Nesting Depth", 
        "Maintainability Index", "Halstead Volume", "Coupling (Ca)", "Coupling (Ce)",
        "Inheritance Depth", "Code Churn", "Risk Score", "Risk Level",
    ])
    for f in result.files:
        writer.writerow([
            f.file_path, f.language, f.loc, f.num_functions, f.num_classes,
            f.cyclomatic_complexity, f.cognitive_complexity, f.max_nesting_depth,
            f.maintainability_index, f.halstead_volume, f.coupling_afferent, f.coupling_efferent,
            f.inheritance_depth, f.code_churn, f.risk_score, f.risk_level,
        ])

    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=analysis_{analysis_id}.csv"},
    )

def _s(text: str) -> str:
    if not text: return ""
    return text.encode("latin-1", errors="replace").decode("latin-1")

class StylizedPDF(FPDF):
    def __init__(self, analysis_id: str):
        super().__init__()
        self.analysis_id = analysis_id

    def header(self):
        # Modern Dark Header
        self.set_fill_color(15, 23, 42) # slate-900
        self.rect(0, 0, 210, 40, 'F')
        
        self.set_font("Helvetica", "B", 24)
        self.set_text_color(255, 255, 255)
        self.set_xy(15, 12)
        self.cell(0, 10, _s("REPLEXITY"), ln=False)
        
        self.set_font("Helvetica", "", 9)
        self.set_text_color(148, 163, 184) # slate-400
        self.set_xy(15, 22)
        self.cell(0, 10, _s("Advanced Code Intelligence Report"), ln=True)
        
        self.ln(12)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(100, 116, 139)
        self.cell(0, 10, f"Page {self.page_no()} | Analysis ID: {self.analysis_id}", align='C')

@router.get("/export/{analysis_id}/pdf")
async def export_pdf(analysis_id: str, ai: bool = False):
    try:
        result = get_cached_result(analysis_id)
        if not result:
            raise HTTPException(status_code=404, detail="Analysis not found.")

        pdf = StylizedPDF(analysis_id)
        pdf.set_auto_page_break(auto=True, margin=20)
        pdf.add_page()
        safe_w = pdf.w - pdf.l_margin - pdf.r_margin

        # ── Project Info ──
        pdf.ln(5)
        pdf.set_text_color(30, 41, 59)
        pdf.set_font("Helvetica", "B", 18)
        pdf.set_x(15)
        # ── Overview Cards ──
        o = result.overview
        pdf.set_fill_color(248, 250, 252) # slate-50
        pdf.rect(15, pdf.get_y(), safe_w, 32, 'F')
        
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(71, 85, 105) # slate-600
        
        pdf.set_xy(20, pdf.get_y() + 5)
        pdf.cell(45, 10, _s(f"HEALTH: {o.health_score}/100"))
        pdf.cell(45, 10, _s(f"FILES: {o.total_files}"))
        pdf.cell(45, 10, _s(f"FUNCTIONS: {o.total_functions}"))
        
        pdf.set_xy(20, pdf.get_y() + 8)
        pdf.cell(45, 10, _s(f"AVG COMPLEXITY: {o.avg_complexity}"))
        pdf.cell(45, 10, _s(f"MAINTAINABILITY: {o.avg_maintainability}"))
        pdf.cell(45, 10, _s(f"TOTAL LOC: {o.total_loc}"))
        
        pdf.ln(20)

        # ── AI Executive Summary (Optional) ──
        if ai:
            from backend.analysis_engine.ai_reviewer import generate_pdf_review
            pdf.set_fill_color(230, 240, 255)
            pdf.rect(15, pdf.get_y(), safe_w, 10, 'F')
            pdf.set_font("Helvetica", "B", 13)
            pdf.set_text_color(15, 23, 42)
            pdf.set_xy(15, pdf.get_y() + 2)
            pdf.cell(0, 6, _s(" AI Executive Solution & Strategy"), ln=True)
            pdf.ln(4)
            
            # Format files for AI review
            top_files = []
            for f in result.files[:50]:
                top_files.append({
                    "path": f.file_path,
                    "risk": f.risk_score,
                    "complexity": f.cyclomatic_complexity,
                    "smells": [s.issue for s in f.code_smells[:3]]
                })
            
            ai_text = generate_pdf_review(result.overview.model_dump(), top_files)
            
            if ai_text:
                pdf.set_font("Helvetica", "", 11)
                pdf.set_text_color(30, 41, 59)
                pdf.set_x(15)
                # Simple cleanup of markdown bolding for the PDF
                ai_text_clean = ai_text.replace('**', '').replace('##', '').replace('* ', '- ')
                pdf.multi_cell(safe_w, 6, _s(ai_text_clean))
                pdf.ln(10)
        else:
            # ── Risk Distribution ──
            pdf.set_font("Helvetica", "B", 13)
            pdf.set_text_color(15, 23, 42)
            pdf.set_x(15)
            pdf.cell(0, 10, _s("Risk Profile Distribution"), ln=True)
            
            colors = {"low": (34, 197, 94), "medium": (234, 179, 8), "high": (249, 115, 22), "critical": (239, 68, 68)}
            for level, count in result.risk_distribution.items():
                pdf.set_x(18)
                pdf.set_fill_color(*colors.get(level, (100, 100, 100)))
                pdf.rect(18, pdf.get_y() + 2, 3, 3, 'F')
                pdf.set_xy(23, pdf.get_y())
                pdf.set_font("Helvetica", "", 10)
                pdf.set_text_color(51, 65, 85)
                pdf.cell(0, 7, _s(f"{level.capitalize()}: {count} files"), ln=True)
            pdf.ln(5)

            # ── Top Risk Files ──
            pdf.set_fill_color(241, 245, 249)
            pdf.set_font("Helvetica", "B", 13)
            pdf.set_text_color(15, 23, 42)
            pdf.set_x(15)
            pdf.cell(safe_w, 10, _s(" Hotspots: Highest Risk Components"), ln=True, fill=True)
            pdf.ln(2)
            
            pdf.set_font("Helvetica", "", 8)
            for f in result.files[:20]:
                pdf.set_x(18)
                pdf.set_text_color(14, 165, 233)
                pdf.cell(0, 5, _s(f.file_path), ln=True)
                pdf.set_x(22)
                pdf.set_text_color(100, 116, 139)
                m_text = f"Risk {f.risk_score} | Complexity {f.cyclomatic_complexity} | Cognitive {f.cognitive_complexity} | LOC {f.loc} | Churn {f.code_churn}"
                pdf.cell(0, 4, _s(m_text), ln=True)
                pdf.ln(1)
            pdf.ln(5)

            # ── Code Smells ──
            if result.code_smells:
                pdf.set_fill_color(241, 245, 249)
                pdf.set_font("Helvetica", "B", 13)
                pdf.set_text_color(15, 23, 42)
                pdf.set_x(15)
                pdf.cell(safe_w, 10, _s(" Strategic Technical Debt: Code Smells"), ln=True, fill=True)
                pdf.ln(2)
                for s in result.code_smells[:25]:
                    pdf.set_x(18)
                    pdf.set_font("Helvetica", "B", 9)
                    pdf.set_text_color(225, 29, 72)
                    pdf.cell(0, 5, _s(f"[{s.issue.upper()}]"), ln=True)
                    pdf.set_x(20)
                    pdf.set_font("Helvetica", "", 9)
                    pdf.set_text_color(51, 65, 85)
                    func_part = f" in {s.function}()" if s.function else ""
                    pdf.multi_cell(safe_w - 5, 5, _s(f"{s.file}{func_part}: {s.suggestion}"))
                    pdf.ln(2)

            # ── Dead Code Discovery ──
            if result.dead_functions:
                pdf.set_fill_color(241, 245, 249)
                pdf.set_font("Helvetica", "B", 13)
                pdf.set_text_color(15, 23, 42)
                pdf.set_x(15)
                pdf.cell(safe_w, 10, _s(" Dead Code Discovery: Potential Removals"), ln=True, fill=True)
                pdf.ln(2)
                for d in result.dead_functions[:30]:
                    pdf.set_x(18)
                    pdf.set_font("Helvetica", "B", 9)
                    pdf.set_text_color(239, 68, 68)
                    pdf.cell(0, 5, _s(f"{d.function}"), ln=True)
                    pdf.set_x(20)
                    pdf.set_font("Helvetica", "", 9)
                    pdf.set_text_color(100, 116, 139)
                    pdf.multi_cell(safe_w - 5, 5, _s(f"Defined in {d.file} at L{d.line}. Never called within project."))
                    pdf.ln(2)

        pdf_bytes = pdf.output()
        if isinstance(pdf_bytes, bytearray): pdf_bytes = bytes(pdf_bytes)
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=analysis_{analysis_id}.pdf"})
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")
