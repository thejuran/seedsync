import pytest


POLY_CONTRACT = {
    "home_resort": "polynesian",
    "use_year_month": 6,
    "annual_points": 160,
    "purchase_type": "resale",
    "name": "Poly Contract",
}

RIVIERA_CONTRACT = {
    "home_resort": "riviera",
    "use_year_month": 12,
    "annual_points": 200,
    "purchase_type": "direct",
    "name": "Riviera Contract",
}


async def _create_contract(client, payload):
    resp = await client.post("/api/contracts/", json=payload)
    assert resp.status_code == 201
    return resp.json()["id"]


async def _add_points(client, contract_id, use_year, allocation_type, points):
    resp = await client.post(
        f"/api/contracts/{contract_id}/points",
        json={"use_year": use_year, "allocation_type": allocation_type, "points": points},
    )
    assert resp.status_code == 201
    return resp.json()


async def _create_reservation(client, contract_id, **overrides):
    payload = {
        "resort": "polynesian",
        "room_key": "deluxe_studio_standard",
        "check_in": "2026-03-15",
        "check_out": "2026-03-20",
        "points_cost": 85,
        **overrides,
    }
    resp = await client.post(f"/api/contracts/{contract_id}/reservations", json=payload)
    assert resp.status_code == 201
    return resp.json()


# --- Basic availability tests ---


@pytest.mark.asyncio
async def test_no_contracts_empty_result(client):
    """No contracts -> empty list, summary all zeros."""
    resp = await client.get("/api/availability?target_date=2026-03-15")
    assert resp.status_code == 200
    data = resp.json()
    assert data["contracts"] == []
    assert data["summary"]["total_contracts"] == 0
    assert data["summary"]["total_available"] == 0


@pytest.mark.asyncio
async def test_one_contract_no_reservations(client):
    """One contract with points, no reservations -> available = total."""
    cid = await _create_contract(client, POLY_CONTRACT)
    await _add_points(client, cid, 2025, "current", 160)

    resp = await client.get("/api/availability?target_date=2026-03-15")
    data = resp.json()
    assert len(data["contracts"]) == 1
    c = data["contracts"][0]
    assert c["total_points"] == 160
    assert c["committed_points"] == 0
    assert c["available_points"] == 160


@pytest.mark.asyncio
async def test_one_contract_with_reservation(client):
    """One contract with points and reservation -> available = total - cost."""
    cid = await _create_contract(client, POLY_CONTRACT)
    await _add_points(client, cid, 2025, "current", 160)
    await _create_reservation(client, cid, points_cost=85)

    resp = await client.get("/api/availability?target_date=2026-03-15")
    data = resp.json()
    c = data["contracts"][0]
    assert c["total_points"] == 160
    assert c["committed_points"] == 85
    assert c["available_points"] == 75


@pytest.mark.asyncio
async def test_missing_target_date(client):
    """Missing target_date param -> 422."""
    resp = await client.get("/api/availability")
    assert resp.status_code == 422


# --- Multi-contract tests ---


@pytest.mark.asyncio
async def test_two_contracts_different_uy(client):
    """Two contracts with different UY months -> correct per-contract breakdown."""
    cid1 = await _create_contract(client, POLY_CONTRACT)
    cid2 = await _create_contract(client, RIVIERA_CONTRACT)
    await _add_points(client, cid1, 2025, "current", 160)
    await _add_points(client, cid2, 2025, "current", 200)

    resp = await client.get("/api/availability?target_date=2026-03-15")
    data = resp.json()
    assert len(data["contracts"]) == 2
    assert data["summary"]["total_contracts"] == 2
    assert data["summary"]["total_available"] == 360


@pytest.mark.asyncio
async def test_summary_totals_match(client):
    """Summary totals match sum of individual contract results."""
    cid1 = await _create_contract(client, POLY_CONTRACT)
    cid2 = await _create_contract(client, RIVIERA_CONTRACT)
    await _add_points(client, cid1, 2025, "current", 160)
    await _add_points(client, cid2, 2025, "current", 200)
    await _create_reservation(client, cid1, points_cost=85)

    resp = await client.get("/api/availability?target_date=2026-03-15")
    data = resp.json()
    total_available = sum(c["available_points"] for c in data["contracts"])
    assert data["summary"]["total_available"] == total_available
    assert data["summary"]["total_committed"] == 85
    assert data["summary"]["total_points"] == 360


# --- Reservation deduction integration ---


@pytest.mark.asyncio
async def test_cancel_reservation_restores_availability(client):
    """Cancel reservation -> re-query availability -> not deducted."""
    cid = await _create_contract(client, POLY_CONTRACT)
    await _add_points(client, cid, 2025, "current", 160)
    res = await _create_reservation(client, cid, points_cost=85)

    # Check availability with reservation
    resp = await client.get("/api/availability?target_date=2026-03-15")
    assert resp.json()["contracts"][0]["available_points"] == 75

    # Cancel the reservation
    await client.put(f"/api/reservations/{res['id']}", json={"status": "cancelled"})

    # Re-check availability -- should be restored
    resp = await client.get("/api/availability?target_date=2026-03-15")
    assert resp.json()["contracts"][0]["available_points"] == 160


@pytest.mark.asyncio
async def test_multiple_reservations_same_uy(client):
    """Multiple reservations in same UY -> all deducted."""
    cid = await _create_contract(client, POLY_CONTRACT)
    await _add_points(client, cid, 2025, "current", 160)
    await _create_reservation(client, cid, points_cost=50, check_in="2026-01-10", check_out="2026-01-15")
    await _create_reservation(client, cid, points_cost=40, check_in="2026-03-15", check_out="2026-03-20")

    resp = await client.get("/api/availability?target_date=2026-03-15")
    c = resp.json()["contracts"][0]
    assert c["committed_points"] == 90
    assert c["available_points"] == 70


# --- End-to-end scenario ---


@pytest.mark.asyncio
async def test_full_e2e_scenario(client):
    """Full scenario: 2 contracts, points, reservations -> verify breakdown."""
    # Create contracts
    cid1 = await _create_contract(client, POLY_CONTRACT)
    cid2 = await _create_contract(client, RIVIERA_CONTRACT)

    # Add point balances (current + banked)
    await _add_points(client, cid1, 2025, "current", 160)
    await _add_points(client, cid1, 2025, "banked", 45)
    await _add_points(client, cid2, 2025, "current", 200)

    # Add reservations
    await _create_reservation(client, cid1, points_cost=85)
    await _create_reservation(
        client, cid2, resort="riviera", points_cost=100,
        check_in="2026-01-10", check_out="2026-01-15",
    )

    # Query availability
    resp = await client.get("/api/availability?target_date=2026-03-15")
    data = resp.json()

    assert data["target_date"] == "2026-03-15"
    assert data["summary"]["total_contracts"] == 2

    # Poly: 160 + 45 = 205 total, 85 committed, 120 available
    poly = next(c for c in data["contracts"] if c["contract_name"] == "Poly Contract")
    assert poly["total_points"] == 205
    assert poly["committed_points"] == 85
    assert poly["available_points"] == 120
    assert poly["balances"] == {"current": 160, "banked": 45}

    # Riviera: 200 total, 100 committed, 100 available
    riv = next(c for c in data["contracts"] if c["contract_name"] == "Riviera Contract")
    assert riv["total_points"] == 200
    assert riv["committed_points"] == 100
    assert riv["available_points"] == 100

    # Summary
    assert data["summary"]["total_points"] == 405
    assert data["summary"]["total_committed"] == 185
    assert data["summary"]["total_available"] == 220
