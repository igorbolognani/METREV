import * as React from 'react';

import { BIOELECTROCHEMICAL_MODEL_PROFILES } from '@metrev/electrochem-models/model-catalog';

void React;

function ProfileCard({
  profile,
}: {
  profile: (typeof BIOELECTROCHEMICAL_MODEL_PROFILES)[number];
}) {
  return (
    <article
      className="public-model-profile"
      data-profile-status={profile.status}
      data-testid={`model-profile-${profile.id}`}
    >
      <header>
        <div>
          <p>
            {profile.system} · {profile.operatingRegime.replaceAll('_', ' ')}
          </p>
          <h3>{profile.title}</h3>
          <code>{profile.id}</code>
        </div>
        <span
          className={
            profile.status === 'executable'
              ? 'public-model-profile__status is-executable'
              : 'public-model-profile__status'
          }
        >
          {profile.status === 'executable' ? 'Runnable' : 'Research profile'}
        </span>
      </header>
      <p className="public-model-profile__architecture">
        {profile.architecture}
      </p>
      <p className="public-model-profile__version">
        {profile.supportedModelVersion
          ? `Current implementation: ${profile.supportedModelVersion}`
          : 'Current implementation: none; this profile cannot be simulated.'}
      </p>
      <div className="public-model-profile__columns">
        <div>
          <h4>Required boundaries</h4>
          <ul>
            {profile.requiredBoundaries.map((boundary) => (
              <li key={boundary}>{boundary}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Limits</h4>
          <ul>
            {profile.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </div>
      </div>
      <footer>
        <span>Literature context</span>
        {profile.evidenceDois.length > 0 ? (
          profile.evidenceDois.map((doi) => (
            <a
              href={`https://doi.org/${doi}`}
              key={doi}
              rel="noreferrer"
              target="_blank"
            >
              {doi} ↗
            </a>
          ))
        ) : (
          <span>No literature identifier recorded</span>
        )}
      </footer>
    </article>
  );
}

export function PublicModelProfileCatalog() {
  const processProfiles = BIOELECTROCHEMICAL_MODEL_PROFILES.filter(
    (profile) => profile.system !== 'biosensor',
  );
  const biosensorProfiles = BIOELECTROCHEMICAL_MODEL_PROFILES.filter(
    (profile) => profile.system === 'biosensor',
  );

  return (
    <section
      aria-labelledby="model-configurations-title"
      className="public-model-catalog"
      data-testid="public-model-profile-catalog"
      id="model-configurations"
    >
      <p className="public-article-sources__eyebrow">Model register</p>
      <h2 id="model-configurations-title">
        Model configurations and architecture coverage
      </h2>
      <p className="public-model-catalog__intro">
        METREV separates configurations the current solver can execute from
        literature-grounded architectures that still need equations, measured
        parameters, numerical benchmarks, and independent comparison data. The
        reference paper motivates a profile; it does not establish that METREV
        reproduces that paper.
      </p>

      <h3>Reactor profiles</h3>
      <div className="public-model-catalog__grid">
        {processProfiles.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} />
        ))}
      </div>

      <h3>Biosensor deployment profiles</h3>
      <div className="public-model-catalog__grid">
        {biosensorProfiles.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} />
        ))}
      </div>

      <p className="public-model-catalog__policy">
        Literature and experimental comparison must match architecture, water
        matrix, operating mode, measured variable, units, and dataset role. A
        journal tier or a fluent LLM summary cannot supply a missing model,
        validate a solver, or promote a pending source claim.
      </p>
    </section>
  );
}
