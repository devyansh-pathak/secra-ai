from pypdf import PdfReader

def extract_pdf_links(pdf_path):
    links = []

    reader = PdfReader(pdf_path)

    for page_num, page in enumerate(reader.pages, start=1):

        if "/Annots" not in page:
            continue

        for annot in page["/Annots"]:

            obj = annot.get_object()

            if obj.get("/Subtype") != "/Link":
                continue

            action = obj.get("/A")

            if action and "/URI" in action:
                links.append({
                    "page": page_num,
                    "url": action["/URI"]
                })

    return links

import re

URL_PATTERN = r'https?://[^\s<>"{}|\\^`\[\]]+'

def extract_text_urls(text):

    return re.findall(URL_PATTERN, text)

from urllib.parse import urlparse

SUSPICIOUS_WORDS = [
    "login",
    "verify",
    "password",
    "banking",
    "secure-update",
    "wallet",
    "crypto",
    "free-money",
    "bonus"
]

SHORTENERS = [
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "goo.gl"
]

def check_url_risk(url):

    risk = "LOW"
    reasons = []

    parsed = urlparse(url)

    domain = parsed.netloc.lower()

    for word in SUSPICIOUS_WORDS:

        if word in url.lower():

            risk = "HIGH"
            reasons.append(
                f"suspicious keyword: {word}"
            )

    for shortener in SHORTENERS:

        if shortener in domain:

            risk = "HIGH"

            reasons.append(
                "url shortener detected"
            )

    if domain.count("-") >= 3:

        risk = "MEDIUM"

        reasons.append(
            "many hyphens in domain"
        )

    if len(domain) > 40:

        risk = "MEDIUM"

        reasons.append(
            "very long domain"
        )

    return {
        "url": url,
        "risk": risk,
        "reasons": reasons
    }

def scan_pdf_links(pdf_path):

    links = extract_pdf_links(pdf_path)

    results = []

    for item in links:

        result = check_url_risk(
            item["url"]
        )

        result["page"] = item["page"]

        results.append(result)

    return results


# result=scan_pdf_links("test")
# print(result)