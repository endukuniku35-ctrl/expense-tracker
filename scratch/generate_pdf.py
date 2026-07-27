import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, PageBreak, KeepTogether
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "CurryTracker — System Architecture & Creation Guide")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)
            
        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, footer_text)
        self.drawString(54, 36, "Confidential & Proprietary — CurryTracker System Documentation")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Palette
    PRIMARY = colors.HexColor("#1A73E8")
    SECONDARY = colors.HexColor("#0D47A1")
    DARK_BG = colors.HexColor("#0F172A")
    TEXT_DARK = colors.HexColor("#1E293B")
    TEXT_MUTED = colors.HexColor("#64748B")
    ACCENT_GREEN = colors.HexColor("#10B981")
    ACCENT_AMBER = colors.HexColor("#F59E0B")
    BORDER_COLOR = colors.HexColor("#E2E8F0")
    LIGHT_BG = colors.HexColor("#F8FAFC")
    
    # Typography Styles
    style_title = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.white,
        alignment=0,
        spaceAfter=8
    )
    
    style_subtitle = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#93C5FD"),
        alignment=0,
        spaceAfter=0
    )
    
    style_h1 = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=SECONDARY,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    style_h2 = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=PRIMARY,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    style_body = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=TEXT_DARK,
        spaceAfter=8
    )
    
    style_body_bold = ParagraphStyle(
        'BodyDarkBold',
        parent=style_body,
        fontName='Helvetica-Bold'
    )

    style_bullet = ParagraphStyle(
        'BulletText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_DARK,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    style_code = ParagraphStyle(
        'CodeSnippet',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0F172A"),
        backColor=colors.HexColor("#F1F5F9"),
        borderColor=colors.HexColor("#CBD5E1"),
        borderWidth=0.5,
        borderPadding=6,
        spaceBefore=6,
        spaceAfter=8
    )

    story = []

    # --- COVER BANNER BLOCK ---
    banner_data = [
        [
            Paragraph("🍛 CurryTracker", style_title),
        ],
        [
            Paragraph("System Architecture, Multi-Tenant Design & Complete Creation Guide", style_subtitle)
        ],
        [
            Paragraph("<font color='#CBD5E1'>Live App:</font> <u>https://expense-tracker-77br.onrender.com</u> &bull; <font color='#CBD5E1'>Date:</font> July 2026", ParagraphStyle('BannerFooter', parent=style_subtitle, fontSize=9, textColor=colors.HexColor("#CBD5E1")))
        ]
    ]
    banner_table = Table(banner_data, colWidths=[504])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), DARK_BG),
        ('TOPPADDING', (0,0), (-1,-1), 16),
        ('BOTTOMPADDING', (0,0), (-1,-1), 16),
        ('LEFTPADDING', (0,0), (-1,-1), 18),
        ('RIGHTPADDING', (0,0), (-1,-1), 18),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 14))

    # --- SECTION 1: EXECUTIVE SUMMARY ---
    story.append(Paragraph("1. Executive Summary", style_h1))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceBefore=2, spaceAfter=8))
    
    exec_summary_text = (
        "<b>CurryTracker</b> is a production-grade, multi-tenant web application designed for managing "
        "shared room expenses, daily curry/meal splits, UPI payment settlements, and roommate communication. "
        "Built with a lightweight Node.js/Express backend and an interactive Vanilla JavaScript Single-Page Application (SPA) "
        "frontend, CurryTracker provides zero-latency expense tracking, dynamic dynamic per-meal cost calculation, 2-second mobile "
        "push notifications, dynamic custom UPI QR code generation, and 1-tap Telegram group report broadcasting."
    )
    story.append(Paragraph(exec_summary_text, style_body))

    # Key Highlights Table
    highlights_data = [
        [Paragraph("<b>Feature</b>", style_body_bold), Paragraph("<b>Implementation & Highlights</b>", style_body_bold)],
        [Paragraph("Multi-Tenant Security", style_body), Paragraph("3-tier RBAC: Main Super Admin, Secondary Group Admins, and Standard Members.", style_body)],
        [Paragraph("Dynamic Split Engine", style_body), Paragraph("Dynamic per-meal cost division based on participating member array (splitBetween).", style_body)],
        [Paragraph("Dual Storage Engine", style_body), Paragraph("Embedded SQLite3 synchronized with persistent JSON data files with auto-healing fallback.", style_body)],
        [Paragraph("Mobile Web Push", style_body), Paragraph("2000ms polling push engine delivering status bar alerts with sound and vibration patterns.", style_body)],
        [Paragraph("UPI & Telegram", style_body), Paragraph("Dynamic custom amount UPI QR generator (upiqr.in) & 1-tap Telegram markdown share.", style_body)]
    ]
    t_highlights = Table(highlights_data, colWidths=[140, 364])
    t_highlights.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#EFF6FF")),
        ('TEXTCOLOR', (0,0), (-1,0), SECONDARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_highlights)
    story.append(Spacer(1, 14))

    # --- SECTION 2: SYSTEM ARCHITECTURE & TECH STACK ---
    story.append(Paragraph("2. System Architecture & Technology Stack", style_h1))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceBefore=2, spaceAfter=8))
    
    tech_stack_data = [
        [Paragraph("<b>Layer</b>", style_body_bold), Paragraph("<b>Technology / Framework</b>", style_body_bold), Paragraph("<b>Core Purpose</b>", style_body_bold)],
        [Paragraph("Frontend Core", style_body), Paragraph("HTML5, Vanilla JS (ES6+ SPA)", style_body), Paragraph("High performance 60fps UI, modular view routing without heavy framework bundles.", style_body)],
        [Paragraph("UI & Aesthetics", style_body), Paragraph("Glassmorphism, CSS Tokens, Bootstrap 5", style_body), Paragraph("Vibrant dark/light hybrid design system, responsive modals, animated stat cards.", style_body)],
        [Paragraph("Analytics & Charts", style_body), Paragraph("Chart.js v4", style_body), Paragraph("Interactive doughnut pie charts, monthly line trends, and weekly bar charts.", style_body)],
        [Paragraph("Backend Framework", style_body), Paragraph("Node.js, Express.js", style_body), Paragraph("RESTful API architecture, route handling, express-session cookie management.", style_body)],
        [Paragraph("Security & Auth", style_body), Paragraph("Bcrypt.js, Express-Session, RBAC", style_body), Paragraph("Salted password hashing (factor 10), session isolation, role enforcement middleware.", style_body)],
        [Paragraph("Database Layer", style_body), Paragraph("SQLite3 + Synchronized JSON Data Files", style_body), Paragraph("Dual-storage fallback engine ensuring zero data loss across cloud deployments.", style_body)],
        [Paragraph("Real-Time Engine", style_body), Paragraph("Mobile Push API + 2000ms Polling", style_body), Paragraph("Instant status bar push notifications with sound, vibration, and custom icons.", style_body)],
        [Paragraph("Integrations", style_body), Paragraph("upiqr.in API, Telegram Web API", style_body), Paragraph("Dynamic custom amount UPI QR generation & 1-tap Telegram group report sharing.", style_body)]
    ]
    t_stack = Table(tech_stack_data, colWidths=[100, 160, 244])
    t_stack.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#EFF6FF")),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_stack)
    story.append(Spacer(1, 14))

    # --- SECTION 3: MULTI-TENANT ROLE HIERARCHY ---
    story.append(Paragraph("3. Multi-Tenant Role-Based Access Control (RBAC)", style_h1))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceBefore=2, spaceAfter=8))
    
    story.append(Paragraph("CurryTracker enforces a strict 3-tier security and visibility hierarchy across all API endpoints and frontend views:", style_body))

    role_data = [
        [Paragraph("<b>Role Tier</b>", style_body_bold), Paragraph("<b>Primary Account Example</b>", style_body_bold), Paragraph("<b>Scope & System Permissions</b>", style_body_bold)],
        [
            Paragraph("👑 <b>Main Super Admin</b><br/><font color='#64748B'>super_admin</font>", style_body),
            Paragraph("<b>Kandukuri Jagan</b><br/>(User ID: <code>192472374</code>)", style_body),
            Paragraph("• Full platform-wide master dashboard & global expense analytics.<br/>• Exclusive ability to create Secondary Group Admins.<br/>• Exclusive access to Credentials Directory with password unhide toggles.<br/>• Exclusive authority to remove/delete (🗑️) member accounts.", style_body)
        ],
        [
            Paragraph("🛡️ <b>Secondary Group Admin</b><br/><font color='#64748B'>admin</font>", style_body),
            Paragraph("<b>anudeep</b><br/>(User ID: <code>192472066</code>)", style_body),
            Paragraph("• Isolated dashboard and expense manager dedicated ONLY to their room group.<br/>• Can add regular <code>Member</code> accounts to their group.<br/>• Record expenses & cash settlements for their room.<br/>• Hidden from credentials directory & super admin settings.", style_body)
        ],
        [
            Paragraph("👤 <b>Standard Member</b><br/><font color='#64748B'>member</font>", style_body),
            Paragraph("<b>Sagar, Prathap, Bharath, Charan, Ganesh, a</b>", style_body),
            Paragraph("• Isolated view restricted ONLY to expenses where they paid or participated in the split.<br/>• Live balance card ('🔴 Owes', '💰 Receives', '✅ Settled').<br/>• Submit payment settlement records.", style_body)
        ]
    ]
    t_roles = Table(role_data, colWidths=[110, 140, 254])
    t_roles.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#EFF6FF")),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_roles)
    story.append(Spacer(1, 14))

    # --- SECTION 4: CORE MATHEMATICAL ALGORITHMS & LOGIC ---
    story.append(Paragraph("4. Core Mathematical Algorithms & System Logic", style_h1))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceBefore=2, spaceAfter=8))
    
    story.append(Paragraph("<b>4.1 Dynamic Per-Meal Split Formula</b>", style_h2))
    story.append(Paragraph(
        "Unlike basic expense apps that assume fixed 4-way splits, CurryTracker dynamically computes per-meal "
        "shares based on the specific participating members selected (<code>splitBetween</code>):",
        style_body
    ))

    equation_text = (
        "<b>Share per Person (Meal i)</b> = Amount(i) / Count(splitBetween_i)<br/><br/>"
        "<b>Total Paid (Member m)</b> = Σ Amount(i) where paidBy = m<br/>"
        "<b>Total Share (Member m)</b> = Σ (Amount(i) / Count(splitBetween_i)) where m ∈ splitBetween_i<br/><br/>"
        "<b>Net Balance (Member m)</b> = (Total Paid + Settlements Out) - (Total Share + Settlements In)"
    )
    story.append(Paragraph(equation_text, style_code))

    story.append(Paragraph("<b>4.2 Auto-Healing Persistent Dual-Storage Engine</b>", style_h2))
    story.append(Paragraph(
        "To guarantee zero data loss across cloud deployments (such as Render ephemeral container restarts), "
        "CurryTracker operates a dual-storage engine:",
        style_body
    ))
    story.append(Paragraph("• <b>Primary Engine</b>: Embedded SQLite3 database executing SQL transactions for high-speed queries.", style_bullet))
    story.append(Paragraph("• <b>Backup Persistence Engine</b>: State synchronized to formatted JSON files (<code>data/users.json</code>, <code>data/expenses.json</code>, <code>data/settlements.json</code>).", style_bullet))
    story.append(Paragraph("• <b>Auto-Healing Initialization</b>: On server startup, <code>initDatabase()</code> verifies seed records and self-heals any missing user accounts or sample expenses.", style_bullet))

    story.append(Spacer(1, 14))

    # --- SECTION 5: APPLICATION ARCHITECTURE & FILE TAXONOMY ---
    story.append(Paragraph("5. Codebase Taxonomy & Application Structure", style_h1))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceBefore=2, spaceAfter=8))
    
    code_taxonomy_text = (
        "<b>expense-tracker/</b><br/>"
        "├── <b>server.js</b> &bull; App entry point, Express server initialization, session middleware, route mounting.<br/>"
        "├── <b>database.js</b> &bull; SQLite3 database connection, JSON read/write handlers, schema setup & seed data.<br/>"
        "├── <b>middleware/auth.js</b> &bull; RBAC protection guards (<code>requireAuth</code>, <code>requireAdmin</code>, <code>requireSuperAdmin</code>).<br/>"
        "├── <b>routes/</b><br/>"
        "│   ├── <b>auth.js</b> &bull; User sign-in, session verification, logout endpoints.<br/>"
        "│   ├── <b>members.js</b> &bull; Member management, Group Admin creation, credentials directory, user removal.<br/>"
        "│   ├── <b>expenses.js</b> &bull; Expense CRUD, dynamic split parsing, group filtering.<br/>"
        "│   ├── <b>balance.js</b> &bull; Group balance calculation engine, settlement recording, cash clearing.<br/>"
        "│   ├── <b>dashboard.js</b> &bull; Aggregated statistics & Chart.js data formatting.<br/>"
        "│   ├── <b>messages.js</b> &bull; Roommate chatroom & Admin broadcast banner backend.<br/>"
        "│   └── <b>reports.js</b> &bull; Monthly analytics & CSV/Excel/PDF export generator.<br/>"
        "└── <b>public/</b><br/>"
        "    ├── <b>dashboard.html</b> &bull; SPA single HTML shell containing glassmorphic view containers & Bootstrap modals.<br/>"
        "    ├── <b>css/style.css</b> &bull; CSS Design System, tokens, glassmorphism utilities, dark/light theme variables.<br/>"
        "    └── <b>js/</b><br/>"
        "        ├── <b>app.js</b> &bull; SPA Router, session state manager, view navigation guards.<br/>"
        "        ├── <b>dashboard.js</b> &bull; Dashboard view renderer, counter animations, Chart.js instances.<br/>"
        "        ├── <b>members.js</b> &bull; Members cards rendering, login directory, Group Admin modal.<br/>"
        "        ├── <b>expenses.js</b> &bull; Expense history table, Add/Edit modal handlers.<br/>"
        "        ├── <b>payments.js</b> &bull; Payment balance sheet, settlements table, custom amount UPI QR generator.<br/>"
        "        ├── <b>messages.js</b> &bull; Roommate chat & Broadcast banner UI controllers.<br/>"
        "        └── <b>notifications.js</b> &bull; 2-second ultra-fast mobile push notification manager."
    )
    story.append(Paragraph(code_taxonomy_text, style_code))

    story.append(Spacer(1, 14))

    # --- SECTION 6: KEY INTEGRATIONS & FEATURES ---
    story.append(Paragraph("6. Key Features & External Integrations", style_h1))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceBefore=2, spaceAfter=8))

    story.append(Paragraph("<b>6.1 Dynamic Custom Amount UPI QR Generator</b>", style_h2))
    story.append(Paragraph(
        "Integrated dynamic UPI QR code generator powered by the <code>upiqr.in</code> API. Users can input any custom settlement "
        "amount or click their exact outstanding balance ('🔴 Owes'). Generates an instant scannable UPI QR code targeting verified "
        "VPA <code>8367047947@ybl</code> with direct deep links to PhonePe, Google Pay, and Paytm.",
        style_body
    ))

    story.append(Paragraph("<b>6.2 2-Second Mobile Push Notification Engine</b>", style_h2))
    story.append(Paragraph(
        "Features a high-frequency (2000ms interval) browser notification synchronizer. Native push notifications pop up "
        "directly in the Android/iOS status bar with custom sound, vibration patterns (<code>[500, 200, 500, 200, 500]</code>), "
        "and app crown icons whenever expenses, payment nudges, or messages are posted.",
        style_body
    ))

    story.append(Paragraph("<b>6.3 1-Tap Telegram Group Report Share</b>", style_h2))
    story.append(Paragraph(
        "Includes 1-tap <b>Share on Telegram</b> buttons across Dashboard, Reports, and Payments views. Automatically compiles "
        "an itemized Markdown report (total curry bills, per-person share, member-by-member breakdown, UPI ID) and opens Telegram "
        "Web or Desktop app via <code>https://t.me/share/url</code> to broadcast directly to room groups.",
        style_body
    ))

    story.append(Spacer(1, 14))

    # --- SECTION 7: DEPLOYMENT & OPERATIONAL DETAILS ---
    story.append(Paragraph("7. Deployment & Operational Credentials", style_h1))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceBefore=2, spaceAfter=8))

    ops_data = [
        [Paragraph("<b>Parameter</b>", style_body_bold), Paragraph("<b>Details / Value</b>", style_body_bold)],
        [Paragraph("Live Hosted URL", style_body), Paragraph("<code>https://expense-tracker-77br.onrender.com</code>", style_body)],
        [Paragraph("GitHub Repository", style_body), Paragraph("<code>https://github.com/endukuniku35-ctrl/expense-tracker.git</code>", style_body)],
        [Paragraph("Main Super Admin Account", style_body), Paragraph("User ID: <code>192472374</code> &bull; Password: <code>kandukurijagan@14062020</code> (Kandukuri Jagan)", style_body)],
        [Paragraph("Secondary Group Admin Account", style_body), Paragraph("User ID: <code>anudeep</code> &bull; Password: <code>anudeep</code> (Group Admin Flat 301)", style_body)],
        [Paragraph("Standard Member Accounts", style_body), Paragraph("User IDs: <code>192472343</code> (Sagar), <code>192411184</code> (Prathap), <code>192411185</code> (Bharath), <code>192412348</code> (Charan), <code>Ganesh</code> (Ganesh), <code>a</code> (Member a)", style_body)],
        [Paragraph("Default Payment VPA", style_body), Paragraph("UPI ID: <code>8367047947@ybl</code>", style_body)]
    ]
    t_ops = Table(ops_data, colWidths=[160, 344])
    t_ops.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#EFF6FF")),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_ops)
    story.append(Spacer(1, 20))

    # Signoff Block
    signoff_text = (
        "<b>Documentation Verification & Sign-off</b><br/>"
        "This architectural guide represents the complete, verified state of the CurryTracker multi-tenant "
        "expense management platform. All features, security policies, role isolations, and integrations are live and fully operational."
    )
    signoff_box = Table([[Paragraph(signoff_text, style_body)]], colWidths=[504])
    signoff_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDF4")),
        ('BORDER', (0,0), (-1,-1), 1, colors.HexColor("#86EFAC")),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(signoff_box)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF at: {filename}")

if __name__ == '__main__':
    out_dir = os.path.dirname(os.path.abspath(__file__))
    target_pdf = os.path.join(out_dir, "CurryTracker_Architecture_and_Creation_Guide.pdf")
    build_pdf(target_pdf)
