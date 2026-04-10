def test_list_specialties(client) -> None:
    r = client.get("/api/exams/specialties")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 4
    slugs = {x["slug"] for x in data}
    assert "clinica-medica" in slugs
    assert "cardiologia" in slugs


def test_list_exams_by_specialty(client) -> None:
    r = client.get("/api/exams/specialties/clinica-medica/exams")
    assert r.status_code == 200
    exams = r.json()
    assert len(exams) >= 1
    assert exams[0]["question_count"] >= 1


def test_get_exam_detail(client, exam_ids: dict[str, str]) -> None:
    eid = exam_ids["exam_id"]
    r = client.get(f"/api/exams/{eid}")
    assert r.status_code == 200
    exam = r.json()
    assert exam["id"] == eid
    assert len(exam["questions"]) >= 1
    assert "options" in exam["questions"][0]
    assert "correct_index" not in exam["questions"][0]


def test_submit_exam_perfect_score(
    client, exam_ids: dict[str, str]
) -> None:
    eid = exam_ids["exam_id"]
    r = client.get(f"/api/exams/{eid}")
    assert r.status_code == 200
    exam = r.json()
    n = len(exam["questions"])
    answers = [1] * n
    r2 = client.post(
        f"/api/exams/{eid}/submit",
        json={"answers": answers},
    )
    assert r2.status_code == 200, r2.text
    out = r2.json()
    assert out["score"] == 100.0
    assert out["total"] == n
    assert all(x["correct"] for x in out["items"])


def test_submit_exam_wrong_count(
    client, exam_ids: dict[str, str]
) -> None:
    eid = exam_ids["exam_id"]
    r = client.get(f"/api/exams/{eid}")
    exam = r.json()
    n = len(exam["questions"])
    answers = [0] * n
    r2 = client.post(
        f"/api/exams/{eid}/submit",
        json={"answers": answers},
    )
    assert r2.status_code == 200
    out = r2.json()
    assert out["score"] == 0.0
    assert not any(x["correct"] for x in out["items"])


def test_submit_exam_mismatch_length(
    client, exam_ids: dict[str, str]
) -> None:
    eid = exam_ids["exam_id"]
    r = client.post(
        f"/api/exams/{eid}/submit",
        json={"answers": [0]},
    )
    assert r.status_code == 400
