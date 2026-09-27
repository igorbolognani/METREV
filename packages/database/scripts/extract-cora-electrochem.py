"""Reproduce the complete, time-aligned MEC current-density traces from CORA.

The source is a locally preserved CC0 ODS file, DOI 10.34810/DATA2866.
This extracts observations for component development; it does not calibrate or
validate the METREV full-cell solver. No missing sample is interpolated.
"""

import hashlib
import json
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[3]
SOURCE_DIR = ROOT / "packages/database/data/research-candidates/10.34810-DATA2866"
SOURCE = SOURCE_DIR / "current-density-alloys.ods"
OUTPUT = SOURCE_DIR / "current-density-complete-series.json"
LSV_SOURCE = SOURCE_DIR / "lsv-catalysts-carbon-cloth.ods"
LSV_OUTPUT = SOURCE_DIR / "lsv-complete-series.json"
EIS_SOURCE = SOURCE_DIR / "eis-catalyst-electrodes.ods"
EIS_OUTPUT = SOURCE_DIR / "eis-observed-pairs.json"
TABLE = "{urn:oasis:names:tc:opendocument:xmlns:table:1.0}"
OFFICE = "{urn:oasis:names:tc:opendocument:xmlns:office:1.0}"
TEXT = "{urn:oasis:names:tc:opendocument:xmlns:text:1.0}"
EXPECTED_SOURCE_SHA256 = "940b8ba42266774077cc488c19f1700e9fec921fa00b9d3ed7f8790830993996"


def cells(row, width=7):
    result = []
    for cell in row.findall(TABLE + "table-cell"):
        raw = cell.get(OFFICE + "value")
        if raw is None:
            raw = "".join(p.text or "" for p in cell.findall(".//" + TEXT + "p"))
        repeated = int(cell.get(TABLE + "number-columns-repeated", "1"))
        result.extend([raw] * min(repeated, width - len(result)))
        if len(result) == width:
            break
    return result + [""] * (width - len(result))


def extract():
    digest = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    if digest != EXPECTED_SOURCE_SHA256:
        raise ValueError("Source ODS changed; recheck source provenance and layout")
    with ZipFile(SOURCE) as archive:
        root = ET.fromstring(archive.read("content.xml"))
    sheets = root.findall(".//" + TABLE + "table")
    if len(sheets) != 1 or sheets[0].get(TABLE + "name") != "Hoja1":
        raise ValueError("Unexpected source sheet")
    rows = [cells(row) for row in sheets[0].findall(TABLE + "table-row")]
    header = rows[0]
    expected = [
        "Cloth Ni85Mo15", "Felt Ni85Mo15", "Cloth Ni76Fe16Mo8",
        "Felt Ni76Fe16Mo8", "Cloth Ni64Fe18Mo18", "Felt Ni64Fe18Mo18",
    ]
    if header[1:] != expected:
        raise ValueError("Source labels changed; do not map catalysts by column position")
    coordinate_rows = [(row_index, row) for row_index, row in enumerate(rows[1:], 2) if row[0]]
    if len(coordinate_rows) != 3673 or coordinate_rows[-1][0] != 3674:
        raise ValueError("Unexpected coordinate coverage")
    times = [float(row[0]) for _, row in coordinate_rows]
    if not all(math.isfinite(t) for t in times) or not all(b > a for a, b in zip(times, times[1:])):
        raise ValueError("Invalid or unordered time coordinate")
    series = []
    exclusions = []
    for col, label in enumerate(expected, 1):
        missing = [row_index for row_index, row in coordinate_rows if not row[col]]
        if missing:
            observed = [
                (row_index, time, float(row[col]))
                for time, (row_index, row) in zip(times, coordinate_rows) if row[col]
            ]
            if not all(math.isfinite(value) for _, _, value in observed):
                raise ValueError(f"Non-finite current density in {label}")
            exclusions.append({
                "worksheet_column": chr(65 + col), "source_label": label,
                "missing_sample_count": len(missing),
                "available_sample_count": len(observed),
                "observed_row_numbers": [row_index for row_index, _, _ in observed],
                "observed_time_days": [time for _, time, _ in observed],
                "observed_current_density_mA_cm2": [value for _, _, value in observed],
                "reason": "Incomplete time-aligned series; measured pairs preserved without interpolation, but excluded from full-grid comparisons",
            })
            continue
        values = [float(row[col]) for _, row in coordinate_rows]
        if not all(math.isfinite(value) for value in values):
            raise ValueError(f"Non-finite current density in {label}")
        letter = chr(65 + col)
        series.append({
            "source_label": label,
            "source_locator": f"Hoja1!{letter}2:{letter}3674",
            "unit": "mA/cm2",
            "sample_count": len(values),
            "values": values,
        })
    if len(series) != 5 or len(exclusions) != 1 or exclusions[0]["missing_sample_count"] != 504:
        raise ValueError("Unexpected completeness classification")
    orphan_cells = [
        (row_index, chr(65 + col), value)
        for row_index, row in enumerate(rows[1:], 2) if not row[0]
        for col, value in enumerate(row[1:], 1) if value
    ]
    if orphan_cells != [(3676, "F", "0")]:
        raise ValueError("Unexpected unpaired rows")
    return {
        "schema_version": 1,
        "source_doi": "10.34810/DATA2866",
        "source_kind": "measured",
        "dataset_role": "component_characterization",
        "review_status": "pending",
        "license": "CC0-1.0",
        "source_file": str(SOURCE.relative_to(ROOT)),
        "source_sha256": digest,
        "coordinate": {
            "name": "time", "unit": "day", "source_locator": "Hoja1!A2:A3674",
            "sample_count": len(times), "values": times,
        },
        "series": series,
        "excluded_series": exclusions,
        "unpaired_source_rows": [{
            "worksheet_row": row_index, "cell": f"{letter}{row_index}", "raw_value": value,
            "reason": "No time coordinate; not treated as an observation",
        } for row_index, letter, value in orphan_cells],
        "method": "Parse original ODS numeric cells without smoothing, interpolation or sign change; use worksheet labels over conflicting README variable descriptions.",
        "study_context": {
            "technology": "MEC",
            "chamber_volume_ml": 35,
            "anode": "graphite fiber brush",
            "cathode": "carbon felt or carbon cloth with catalyst layer by series label",
            "feed": "sodium acetate in mineral medium, 1.5 g/L",
            "initial_ph": 7.5,
            "conductivity_ms_cm": 13,
            "source_locator": "README-source.txt, METHODOLOGICAL INFORMATION §1 and TABULAR DATA Figure 5",
        },
        "applicability": "Current-density component benchmark under the published MEC setup; not a full-cell 0D validation set. Applied voltage, electrode area, gas yields, COD and time-varying substrate are not established by this extraction.",
    }


def extract_lsv():
    digest = hashlib.sha256(LSV_SOURCE.read_bytes()).hexdigest()
    if digest != "22116a643f43ef981835550c04a9fac14341420bd7a0da751c6e9d1539f98256":
        raise ValueError("LSV source ODS changed; recheck source provenance and layout")
    with ZipFile(LSV_SOURCE) as archive:
        root = ET.fromstring(archive.read("content.xml"))
    sheets = root.findall(".//" + TABLE + "table")
    if len(sheets) != 1 or sheets[0].get(TABLE + "name") != "Hoja1":
        raise ValueError("Unexpected LSV sheet")
    rows = [cells(row) for row in sheets[0].findall(TABLE + "table-row")]
    labels = [
        "Ni64Fe18Mo18 electrodeposition", "Ni76Fe16Mo8 electrodeposition",
        "Ni85Mo15 electrodeposition", "Cu100 manual deposition",
        "Ni100 electrodeposition", "Ni100 manual deposition",
    ]
    if rows[0][1:] != labels:
        raise ValueError("LSV catalyst labels changed")
    observations = [(i, row) for i, row in enumerate(rows[1:], 2) if row[0]]
    if len(observations) != 3001 or observations[-1][0] != 3002:
        raise ValueError("Unexpected LSV observation count")
    potentials = [float(row[0]) for _, row in observations]
    if not all(math.isfinite(x) for x in potentials) or not all(b < a for a, b in zip(potentials, potentials[1:])):
        raise ValueError("Invalid LSV potential coordinate")
    series = []
    for col, label in enumerate(labels, 1):
        if any(not row[col] for _, row in observations):
            raise ValueError(f"Missing LSV observation for {label}")
        values = [float(row[col]) for _, row in observations]
        if not all(math.isfinite(x) for x in values):
            raise ValueError(f"Non-finite LSV current for {label}")
        letter = chr(65 + col)
        series.append({
            "source_label": label, "source_locator": f"Hoja1!{letter}2:{letter}3002",
            "unit": "A", "sample_count": len(values), "values": values,
        })
    return {
        "schema_version": 1, "source_doi": "10.34810/DATA2866",
        "source_kind": "measured", "dataset_role": "electrode_characterization",
        "review_status": "pending", "license": "CC0-1.0",
        "source_file": str(LSV_SOURCE.relative_to(ROOT)), "source_sha256": digest,
        "coordinate": {
            "name": "potential_vs_Ag_AgCl", "unit": "V", "source_locator": "Hoja1!A2:A3002",
            "sample_count": len(potentials), "values": potentials,
        },
        "series": series,
        "method": "Parse native ODS numeric cells without smoothing, normalization, catalyst relabeling or removing signed currents.",
        "source_discrepancy": "README describes 3001 rows x 12 columns, while native worksheet has one shared potential and six labeled current columns; native layout preserved.",
        "applicability": "Electrode LSV curves in A versus V vs Ag/AgCl; electrode area, measurement protocol and replicate uncertainty are not established for kinetic parameter fitting or full-cell solver validation.",
    }


def extract_eis():
    digest = hashlib.sha256(EIS_SOURCE.read_bytes()).hexdigest()
    if digest != "2ae4220f58c02fb7f29a882281c3006990bf6cffd75f9395ee5f14f6f12ca1f3":
        raise ValueError("EIS source ODS changed; recheck source provenance and layout")
    with ZipFile(EIS_SOURCE) as archive:
        root = ET.fromstring(archive.read("content.xml"))
    sheets = root.findall(".//" + TABLE + "table")
    if len(sheets) != 1 or sheets[0].get(TABLE + "name") != "Hoja1":
        raise ValueError("Unexpected EIS sheet")
    rows = [cells(row, 16) for row in sheets[0].findall(TABLE + "table-row")]
    labels = [
        "Cloth Ni", "felt Ni", "Felt Ni64Fe18Mo18", "Cloth Ni64Fe18Mo18",
        "Felt Ni76Fe16Mo8", "Cloth Ni76Fe16Mo8", "Felt NiMo", "Cloth NiMo",
    ]
    if len(rows) != 41 or rows[0][::2] != labels or rows[1][::2] != ["Re(Z)/Ohm"] * 8:
        raise ValueError("Unexpected EIS column structure")
    if rows[1][1::2] != ["#NAME?"] * 8:
        raise ValueError("EIS secondary-column formula labels changed")
    series = []
    for index, label in enumerate(labels):
        col = index * 2
        observed = [
            (row_index, row[col], row[col + 1])
            for row_index, row in enumerate(rows[2:], 3)
            if row[col] or row[col + 1]
        ]
        if any(not x or not y for _, x, y in observed):
            raise ValueError(f"Unpaired EIS observation for {label}")
        re_z = [float(x) for _, x, _ in observed]
        secondary = [float(y) for _, _, y in observed]
        if not all(math.isfinite(x) for x in re_z + secondary):
            raise ValueError(f"Non-finite EIS observation for {label}")
        if len(observed) not in (26, 36, 38):
            raise ValueError(f"Unexpected EIS coverage for {label}")
        series.append({
            "source_label": label,
            "source_locator": f"Hoja1!{chr(65 + col)}3:{chr(66 + col)}{observed[-1][0]}",
            "sample_count": len(observed),
            "worksheet_rows": [row_index for row_index, _, _ in observed],
            "real_ohm": re_z,
            "secondary_ohm_raw": secondary,
        })
    if sum(s["sample_count"] for s in series) != 290:
        raise ValueError("Unexpected total EIS pair count")
    return {
        "schema_version": 1, "source_doi": "10.34810/DATA2866",
        "source_kind": "measured", "dataset_role": "electrode_characterization",
        "review_status": "pending", "license": "CC0-1.0",
        "source_file": str(EIS_SOURCE.relative_to(ROOT)), "source_sha256": digest,
        "series": series,
        "method": "Preserve every numeric pair from native ODS in row order, without fitting or inferring frequency; retain literal worksheet catalyst headers.",
        "source_discrepancy": "Secondary column header renders #NAME?; source README calls this -Im(Z) in ohms, but sign/formula interoperability requires independent reconciliation. Catalyst labels also differ between README and worksheet.",
        "applicability": "Raw Nyquist-style pairs for inspection only; no frequency coordinate, fitting circuit, replicate uncertainty or validated polarization parameters are available.",
    }


if __name__ == "__main__":
    if len(sys.argv) > 2 or (len(sys.argv) == 2 and sys.argv[1] != "--check"):
        raise SystemExit("Usage: extract-cora-electrochem.py [--check]")
    for output, payload in (
        (OUTPUT, extract()), (LSV_OUTPUT, extract_lsv()), (EIS_OUTPUT, extract_eis()),
    ):
        serialized = json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n"
        if len(sys.argv) == 2:
            if not output.is_file() or output.read_text() != serialized:
                raise SystemExit(f"Extract is missing or stale: {output.relative_to(ROOT)}")
        else:
            output.write_text(serialized)
        print(output.relative_to(ROOT))
