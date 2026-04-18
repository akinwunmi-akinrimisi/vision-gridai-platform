-- I1 setup: 3 throwaway topics designed to exercise different register classifications.
-- All go in US Credit Cards project (75eb2712...). Marked review_status='qa_integration' for cleanup.

INSERT INTO topics (
  id, project_id, topic_number, playlist_group, playlist_angle,
  original_title, seo_title, narrative_hook, key_segments,
  scene_count, review_status, status,
  primary_problem_trigger, target_audience_segment, psychographics
) VALUES
-- T1: NOIR-bait — financial fraud investigation content
(
  'aa111111-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  '75eb2712-ef3e-47b7-b8db-5be3740233ff',
  99911,
  1,
  'QA Integration - Noir',
  'QA-I1: The Credit Card Scheme That Stole $2.3 Billion from American Retirees',
  'QA-I1: The Credit Card Scheme That Stole $2.3 Billion from American Retirees',
  'For eighteen years, a ring of predatory issuers used hidden fees and deceptive disclosure to drain retirement accounts. Internal memos, leaked deposition transcripts, and whistleblower testimony expose how regulators failed to act. This is the investigation into one of the largest consumer financial frauds in American history, and the conspiracy of silence that let it continue.',
  'Chapter 1: The Scheme Exposed / Chapter 2: Leaked Internal Memos / Chapter 3: Whistleblower Testimony / Chapter 4: The Regulators Who Looked Away',
  0, 'qa_integration', 'qa_integration',
  'Investigation language, leaked-memo aesthetic, forensic documents, wrongdoing exposure, predatory schemes, whistleblowers',
  'Adults 35-70, true-crime documentary viewers, financial investigation audience',
  'Skeptical of institutions, values investigative journalism, drawn to exposes and conspiracy-revealed narratives'
),
-- T2: PREMIUM-bait — luxury travel lifestyle content
(
  'bb222222-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
  '75eb2712-ef3e-47b7-b8db-5be3740233ff',
  99912,
  1,
  'QA Integration - Premium',
  'QA-I1: The Amex Centurion Black Card Benefits I Used on a $47,000 Private Villa in Santorini',
  'QA-I1: The Amex Centurion Black Card Benefits I Used on a $47,000 Private Villa in Santorini',
  'A Platinum holder upgraded to Centurion specifically for one trip: a private cliffside villa in Oia overlooking the caldera, Michelin-starred chef on premises, personal concierge arranging Aegean yacht charters. She documented every benefit redeemed across forty-seven thousand dollars of travel. What she found about the metal card was not what Amex markets.',
  'Chapter 1: The $47K Trip / Chapter 2: Centurion vs Platinum / Chapter 3: Five-Star Hotel Benefits / Chapter 4: Private Client Services',
  0, 'qa_integration', 'qa_integration',
  'Luxury travel, five-star hotels, private villas, Michelin dining, Centurion Black card, aspirational wealth, HNW lifestyle',
  'Affluent adults 35-60, luxury travel enthusiasts, Amex Platinum/Centurion cardholders, premium cardholder community',
  'Aspirational, values refinement and understatement, appreciates luxury earned not inherited, discerning about brand authenticity'
),
-- T3: SIGNAL-bait — crypto/fintech content
(
  'cc333333-cccc-4ccc-cccc-cccccccccccc',
  '75eb2712-ef3e-47b7-b8db-5be3740233ff',
  99913,
  1,
  'QA Integration - Signal',
  'QA-I1: How Coinbase Card and the New Crypto-Rewards Blockchain APIs Are Rebuilding Payment Infrastructure',
  'QA-I1: How Coinbase Card and the New Crypto-Rewards Blockchain APIs Are Rebuilding Payment Infrastructure',
  'A technical deep-dive into the tokenization layer behind crypto-backed credit cards. We examine the smart contract architecture, the off-chain settlement APIs, the neural-network fraud detection model, and the algorithmic rewards engine. The Visa+blockchain bridge protocol. The ERC-4337 account abstraction that made it possible.',
  'Chapter 1: The API Layer / Chapter 2: Smart Contract Settlement / Chapter 3: ML Fraud Detection / Chapter 4: Algorithmic Rewards Engine',
  0, 'qa_integration', 'qa_integration',
  'Tokenization, blockchain APIs, smart contracts, neural networks, algorithmic systems, ERC-4337, cybersecurity',
  'Tech-savvy adults 25-45, developers, crypto-native audience, fintech early adopters',
  'Values technical precision, follows bleeding-edge tech, appreciates clinical product design, Apple keynote aesthetic resonates'
)
RETURNING id, seo_title;
