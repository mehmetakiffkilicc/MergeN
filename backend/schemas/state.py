from typing import TypedDict, Literal, Optional


Phase = Literal["research", "xray", "analysis", "advisor", "challenger", "done"]


# ---------------------------------------------------------------------------
# Ham veri tipleri (Research ajanı çıktısı)
# ---------------------------------------------------------------------------

class Review(TypedDict):
    text: str
    source: str           # trendyol | hepsiburada | forum
    date: Optional[str]
    length: int
    stars: Optional[float]
    photos: list[str]     # yorum fotoğrafı URL'leri (görsel doğrulama aday havuzu)


class ForumThread(TypedDict):
    url: str
    title: str
    snippet: str
    platform: str         # donanimhaber | technopat | sikayetvar | eksisozluk | webtekno


class YouTubeVideo(TypedDict):
    url: str
    title: str
    channel: str
    channel_url: Optional[str]
    subscriber_count: Optional[int]
    transcript: Optional[str]
    comments: list[str]               # YouTube video yorumları (scrapper)
    reviewer_trust: Optional[float]   # 0-100, Gün 5'te xray dolduracak
    duration: Optional[str]
    segments: Optional[list[dict]]


class PriceData(TypedDict):
    current_price: Optional[float]
    lowest_price_30d: Optional[float]
    highest_price_90d: Optional[float]   # "son 3 ayın en yüksek fiyatı" kontrolü için
    source: str


class ResearchOutput(TypedDict):
    reviews: list[Review]
    forum_threads: list[ForumThread]
    youtube_videos: list[YouTubeVideo]
    price_data: dict
    qa_items: list[dict]   # scrapper Q&A verileri (Trendyol + HB soru-cevap)
    hb_summary: Optional[dict]



# ---------------------------------------------------------------------------
# Multimodal analiz tipleri
# ---------------------------------------------------------------------------

class VideoMoment(TypedDict):
    video_url: str
    timestamp: str              # "4:23-4:53"
    visible_value: Optional[str]
    claimed_value: Optional[str]
    discrepancy: Optional[str]  # None → tutarsızlık yok


class ImageVerification(TypedDict):
    manufacturer_image_url: str
    real_image_url: str         # YouTube / forum'dan gerçek görüntü
    differences: list[str]


# ---------------------------------------------------------------------------
# Röntgen ajanı tipleri (Xray)
# ---------------------------------------------------------------------------

class PriceVerification(TypedDict):
    real_discount: Optional[float]
    fake_discount_alert: bool


class ClaimResult(TypedDict):
    claim: str
    reality: str
    score: float
    contrary_percentage: Optional[int]



class ReviewerSignal(TypedDict):
    kind: str   # good | bad | warn
    text: str


class ReviewerProfile(TypedDict):
    channel: str
    handle: str
    trust_score: float          # 0-100
    tier: str                   # trusted | neutral | biased
    consistency: float          # 0-100
    sponsorship_ratio: float    # 0-100 (% sponsorlu içerik)
    accuracy_delta: float       # pozitif = gerçeği öngörmüş, negatif = yanıltıcı
    signals: list[ReviewerSignal]
    contribution: str           # bu ürün analizine katkısı
    subscriber_count: Optional[int]   # abone sayısı (ham int)
    subscribers_label: Optional[str]  # "150B", "1.5M" gibi formatlanmış


class XrayOutput(TypedDict):
    price_verification: PriceVerification
    claims: list[ClaimResult]
    data_gaps: list[str]            # eksik veri katmanları (ecommerce_reviews, price_history, visual)
    reviewers: list[ReviewerProfile]
    xray_reveal: Optional[dict]     # {before: {...}, after: {...}} slider verisi


# ---------------------------------------------------------------------------
# Manipülasyon DNA + Güven skoru (xray sonrası hesaplanır)
# ---------------------------------------------------------------------------

class ManipulationDNA(TypedDict):
    review_layer: Optional[float]   # None = scrapper bekleniyor; 0-100 = max manipülasyon
    price_layer: Optional[float]    # None = scrapper bekleniyor
    visual_layer: Optional[float]   # None = multimodal ileride
    claim_layer: float


class WeightedTrustScore(TypedDict):
    total: float               # 0-100
    forum_signal: float        # ağırlık %30 (ecommerce varsa), %40 (yoksa)
    youtube_signal: float      # ağırlık %30 (ecommerce varsa), %40 (yoksa)
    ecommerce_signal: Optional[float]  # None = scrapper bekleniyor; ağırlık %25
    claim_signal: float        # ağırlık %15 (ecommerce varsa), %20 (yoksa)


# ---------------------------------------------------------------------------
# Kaynaklar arası çelişki (zengin şema)
# ---------------------------------------------------------------------------

class ConflictStatement(TypedDict):
    source: str
    source_type: str            # forum | youtube | ecommerce | manufacturer
    value: str
    stance: str                 # positive | negative | neutral
    detail: str
    credibility: float          # 0-100


class Contradiction(TypedDict):
    claim: str
    sources: list[str]
    more_reliable_source: Optional[str]
    # v2 zengin alanlar
    topic: Optional[str]
    severity: Optional[str]     # low | medium | high
    statements: list[ConflictStatement]
    resolution: Optional[str]


# ---------------------------------------------------------------------------
# Analiz ajanı tipleri
# ---------------------------------------------------------------------------

class CategoryScore(TypedDict):
    category: str
    score: float
    positive_count: int
    negative_count: int


class Strength(TypedDict):
    aspect: str
    mention_count: int


class Weakness(TypedDict):
    aspect: str
    mention_count: int


class AnalysisOutput(TypedDict):
    category_scores: list[CategoryScore]
    strengths: list[Strength]
    weaknesses: list[Weakness]
    suitable_for: list[str]
    not_suitable_for: list[str]


# ---------------------------------------------------------------------------
# Danışman ajanı tipleri
# ---------------------------------------------------------------------------

class UserProfile(TypedDict):
    answers: dict[str, str]   # soru metni → kullanıcı cevabı


class AdvisorQuestion(TypedDict):
    question: str
    options: list[str]


class AdvisorOutput(TypedDict):
    questions: list[AdvisorQuestion]
    personal_score: Optional[float]
    recommendation: Optional[Literal["AL", "KOSULLU", "ALMA"]]  # profil yokken None
    rationale: str
    alternatives: list[dict]   # [{name, price, trust_score, decision, match_score, match_reason}]


# ---------------------------------------------------------------------------
# Challenger ajanı tipleri
# ---------------------------------------------------------------------------

class ChallengerArgument(TypedDict):
    scenario: str
    for_whom: str
    reason: str


class ChallengerOutput(TypedDict):
    arguments: list[ChallengerArgument]
    balanced_advice: str


# ---------------------------------------------------------------------------
# Ana pipeline state
# ---------------------------------------------------------------------------

class ProductState(TypedDict):
    product_name: str
    product_url: Optional[str]
    current_phase: Phase
    error: Optional[str]

    # Ajan çıktıları
    research: Optional[ResearchOutput]
    xray: Optional[XrayOutput]
    analysis: Optional[AnalysisOutput]
    advisor: Optional[AdvisorOutput]
    challenger: Optional[ChallengerOutput]

    # Pipeline genelinde paylaşılan çıktılar
    user_profile: Optional[UserProfile]
    manipulation_dna: Optional[ManipulationDNA]
    weighted_trust_score: Optional[WeightedTrustScore]
    image_verification: Optional[ImageVerification]
    video_analysis: list[VideoMoment]      # multimodal video anları
    contradictions: list[Contradiction]   # kaynaklar arası çelişkiler
