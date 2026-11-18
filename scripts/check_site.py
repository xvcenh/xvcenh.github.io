"""Check local references and article discovery in the built Jekyll site."""
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path("_site").resolve()
CSS_URL = re.compile(r"""url\(\s*("[^"]*"|'[^']*'|[^)\s]+)\s*\)""", re.I)


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.anchors = set()

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if value and (key == "id" or tag == "a" and key == "name"):
                self.anchors.add(value)
            if key in ("src", "href", "action") and value:
                self.links.append(value)


def file_at(url):
    path = ROOT / unquote(urlsplit(url).path).lstrip("/")
    return path / "index.html" if path.is_dir() else path


def main():
    errors = []
    pages = sorted(ROOT.rglob("*.html"))
    if not pages:
        raise SystemExit("Build the site before running the checks.")
    documents = {}
    references = {}
    for page in pages:
        parsed = References()
        parsed.feed(page.read_text(encoding="utf-8"))
        documents[page] = parsed.anchors
        references[page] = parsed.links

    for style in ROOT.rglob("*.css"):
        css = style.read_text(encoding="utf-8")
        references[style] = [value.strip("\'\"") for value in CSS_URL.findall(css)]

    for source, links in references.items():
        location = "/" + source.relative_to(ROOT).as_posix()
        for link in links:
            target = urlsplit(urljoin(location, link))
            if target.scheme or target.netloc:
                continue
            file = file_at(target.path)
            if not file.is_file():
                errors.append(f"{location} → {link}")
            elif target.fragment and file in documents and unquote(target.fragment) not in documents[file]:
                errors.append(f"Missing anchor {location} → {link}")
    posts = json.loads((ROOT / "search-index.json").read_text(encoding="utf-8"))
    urls = {post["url"] for post in posts}
    if not posts or len(urls) != len(posts):
        errors.append("Search index is empty or contains duplicate permalinks.")
    for post in posts:
        if not file_at(post["url"]).is_file() or not post["body"].strip():
            errors.append("Incomplete index entry: " + post["url"])
    for route in ("/issues/", "/search/", "/projects/", "/categories/", "/galaxy/", "/tech-graph/", "/fivebar-linkage/",
                  "/devour-tide/", "/super-blog/", "/about/", "/ai-build/", "/404.html", "/feed.xml", "/sitemap.xml"):
        if not file_at(route).is_file():
            errors.append("Missing route " + route)
    if errors:
        raise SystemExit("\n".join(sorted(set(errors))))
    print(f"Verified {len(pages)} HTML pages and {len(posts)} indexed articles.")


if __name__ == "__main__":
    main()
