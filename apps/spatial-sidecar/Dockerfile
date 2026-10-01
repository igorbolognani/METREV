# DOLFINx v0.10.0-r1 multiarch manifest digest; numerical PDE solves remain test fixtures.
FROM ghcr.io/fenics/dolfinx/dolfinx@sha256:25a4952542107766402a1de448ab1b387df70243e10f9d3f717d8c353f2acae4

RUN apt-get update && apt-get install -y --no-install-recommends libglu1-mesa libxft2 \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m pip install --no-cache-dir gmsh==4.15.2 scipy==1.17.0

WORKDIR /opt/metrev-spatial
COPY apps/spatial-sidecar/metrev_spatial ./metrev_spatial
# Keep the DOLFINx image's PYTHONPATH (which exposes its installed Python
# bindings) while adding the sidecar package. Overwriting it makes `python3`
# unable to import dolfinx in the CI smoke command.
ENV PYTHONPATH=/opt/metrev-spatial:${PYTHONPATH}
HEALTHCHECK --interval=30s --timeout=5s CMD printf '{"protocol_version":"spatial-sidecar-v1","request_id":"00000000-0000-4000-8000-000000000000","operation":"health"}' | python3 -m metrev_spatial | grep -q '"status":"ok"'
ENTRYPOINT ["python3", "-m", "metrev_spatial"]
