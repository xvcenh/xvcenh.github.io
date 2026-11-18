"""Check local references and article discovery in the built Jekyll site."""
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path("_site").resolve()


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ("src", "href") and value:
                self.links.append(value)


def file_at(url):
    path = ROOT / unquote(urlsplit(url).path).lstrip("/")
    return path / "index.html" if path.is_dir() else path


def main():
    errors = []
    pages = sorted(ROOT.rglob("*.html"))
    if not pages:
        raise SystemExit("Build the site before running the checks.")
    for page in pages:
        parsed = References()
        parsed.feed(page.read_text(encoding="utf-8"))
        source = "/" + page.relative_to(ROOT).as_posix()
        for link in parsed.links:
            target = urlsplit(link)
            if target.scheme or target.netloc or not target.path:
                continue
            if not file_at(urljoin(source, link)).is_file():
                errors.append(f"{source} → {link}")
    posts = json.loads((ROOT / "search-index.json").read_text(encoding="utf-8"))
    urls = {post["url"] for post in posts}
    if not posts or len(urls) != len(posts):
        errors.append("Search index is empty or contains duplicate permalinks.")
    for post in posts:
        if not file_at(post["url"]).is_file() or not post["body"].strip():
            errors.append("Incomplete index entry: " + post["url"])
    for route in ("/issues/", "/search/", "/projects/", "/categories/", "/feed.xml", "/sitemap.xml"):
        if not file_at(route).is_file():
            errors.append("Missing route " + route)
    if errors:
        raise SystemExit("\n".join(sorted(set(errors))))
    print(f"Verified {len(pages)} HTML pages and {len(posts)} indexed articles.")


if __name__ == "__main__":
    main()
