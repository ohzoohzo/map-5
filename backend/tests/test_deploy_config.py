from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def requirement_lines(path: Path) -> set[str]:
    return {line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip() and not line.startswith("#")}


def test_vercel_requirements_are_a_subset_of_backend_requirements():
    """루트 requirements.txt(Vercel)는 backend 와 같은 버전 범위를 쓴다: 한쪽만 고쳐 어긋나는 것을 막는다."""
    deploy = requirement_lines(ROOT / "requirements.txt")
    backend = requirement_lines(ROOT / "backend" / "requirements.txt")
    assert deploy and deploy <= backend, sorted(deploy - backend)


def test_vercel_entrypoint_exposes_the_backend_app():
    from backend.app.main import app as backend_app
    import index

    assert index.app is backend_app
