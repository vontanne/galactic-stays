using {galactic.stays as db} from '../db/schema';
using {CatalogService} from '../srv/catalog-service';
using {HotelManagementService} from '../srv/hotel-management-service';
using {AdminService} from '../srv/admin-service';

annotate db.Planets with @cds.odata.valuelist {
  ID       @title: '{i18n>Planet}'  @Common.Text: name  @Common.TextArrangement: #TextOnly;
  name     @title: '{i18n>Planet}';
  region   @title: '{i18n>Region}';
  climate  @title: '{i18n>Climate}';
  terrain  @title: '{i18n>Terrain}';
  isActive @title: '{i18n>Active}';
};

annotate db.Travelers with {
  userId       @title: '{i18n>User}';
  firstName    @title: '{i18n>FirstName}';
  lastName     @title: '{i18n>LastName}';
  dateOfBirth  @title: '{i18n>DateOfBirth}';
  species      @title: '{i18n>Species}';
  birthPlanet  @title: '{i18n>BirthPlanet}'  @Common.Text: birthPlanet.name  @Common.TextArrangement: #TextOnly;
  isActive     @title: '{i18n>Active}';
};

annotate db.Hotels with @cds.odata.valuelist {
  ID           @title: '{i18n>Hotel}'        @Common.Text: name         @Common.TextArrangement: #TextOnly;
  name         @title: '{i18n>Hotel}';
  planet       @title: '{i18n>Planet}'       @Common.Text: planet.name  @Common.TextArrangement: #TextOnly;
  address      @title: '{i18n>Address}';
  description  @title: '{i18n>Description}'  @UI.MultiLineText;
  phoneNumber  @title: '{i18n>PhoneNumber}';
  checkInTime  @title: '{i18n>CheckInTime}';
  checkOutTime @title: '{i18n>CheckOutTime}';
  isActive     @title: '{i18n>Active}';
};

annotate db.HotelRatings with {
  averageRating @title: '{i18n>AverageRating}';
  reviewCount   @title: '{i18n>ReviewCount}';
};

annotate db.HotelManagementAssignments with {
  hotel  @title: '{i18n>Hotel}'  @Common.Text: hotel.name  @Common.TextArrangement: #TextOnly;
  userId @title: '{i18n>Manager}';
};

annotate db.Rooms with @cds.odata.valuelist {
  ID             @title: '{i18n>Room}'           @Common.Text         : number      @Common.TextArrangement: #TextOnly;
  hotel          @title: '{i18n>Hotel}'          @Common.Text         : hotel.name  @Common.TextArrangement: #TextOnly;
  number         @title: '{i18n>RoomNumber}';
  type           @title: '{i18n>RoomType}';
  capacity       @title: '{i18n>Capacity}';
  pricePerNight  @title: '{i18n>PricePerNight}'  @Measures.ISOCurrency: currency_code;
  isActive       @title: '{i18n>Active}';
};

annotate db.Bookings with {
  traveler          @title: '{i18n>Traveler}';
  room              @title: '{i18n>Room}'             @Common.Text         : room.number  @Common.TextArrangement: #TextOnly;
  checkInDate       @title: '{i18n>CheckInDate}';
  checkInTime       @title: '{i18n>CheckInTime}';
  checkOutDate      @title: '{i18n>CheckOutDate}';
  checkOutTime      @title: '{i18n>CheckOutTime}';
  guestCount        @title: '{i18n>Guests}';
  specialRequests   @title: '{i18n>SpecialRequests}'  @UI.MultiLineText;
  status            @title: '{i18n>Status}';
  statusCriticality @UI.Hidden;
  paymentStatus     @title: '{i18n>PaymentStatus}';
  paymentExpiresAt  @title: '{i18n>PaymentDeadline}';
  nightlyRate       @title: '{i18n>NightlyRate}'      @Measures.ISOCurrency: currency_code;
  totalAmount       @title: '{i18n>TotalAmount}'      @Measures.ISOCurrency: currency_code;
  paidAt            @title: '{i18n>PaidAt}';
  cancelledAt       @title: '{i18n>CancelledAt}';
  completedAt       @title: '{i18n>CompletedAt}';
  refundAmount      @title: '{i18n>RefundAmount}'     @Measures.ISOCurrency: currency_code;
  cancellationFee   @title: '{i18n>CancellationFee}'  @Measures.ISOCurrency: currency_code;
};

annotate db.Reviews with {
  hotel    @title: '{i18n>Hotel}'    @Common.Text: hotel.name  @Common.TextArrangement: #TextOnly;
  traveler @title: '{i18n>Traveler}';
  rating   @title: '{i18n>Rating}';
  comment  @title: '{i18n>Comment}'  @UI.MultiLineText;
};

annotate CatalogService.Hotels with {
  reviewCount @title: '{i18n>ReviewCount}';
};

annotate CatalogService.Reviews with {
  authorName @title: '{i18n>Author}';
};

annotate HotelManagementService.Hotels with {
  planetName  @title: '{i18n>Planet}';
  reviewCount @title: '{i18n>ReviewCount}';
};

annotate HotelManagementService.Reviews with {
  authorName @title: '{i18n>Author}';
};

annotate AdminService.Hotels with {
  reviewCount @title: '{i18n>ReviewCount}';
};
