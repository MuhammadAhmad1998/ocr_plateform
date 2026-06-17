def test_open_access_documents_list(client):
    response = client.get("/api/v1/documents/")
    assert response.status_code == 200


def test_openapi_has_no_security_schemes(client):
    schema = client.get("/openapi.json").json()
    assert not schema.get("components", {}).get("securitySchemes")
